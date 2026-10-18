package com.kynexis.gateway.config;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import com.kynexis.gateway.security.JwtService;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtService jwtService;
    private final String allowedOrigins;

    public WebSocketConfig(
            JwtService jwtService,
            @Value("${websocket.allowed-origins:http://localhost:5173,http://localhost:3000}") String allowedOrigins) {
        this.jwtService = jwtService;
        this.allowedOrigins = allowedOrigins;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        String[] origins = allowedOrigins.split(",");

        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(origins)
                .withSockJS();

        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(origins);
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor =
                        MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

                if (accessor == null) {
                    return message;
                }

                try {
                    if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                        handleConnect(accessor);
                    } else if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
                        handleSubscribe(accessor);
                    } else if (StompCommand.DISCONNECT.equals(accessor.getCommand())) {
                        log.debug("WebSocket client disconnected session={}", accessor.getSessionId());
                    }
                } catch (SecurityException ex) {
                    log.warn("WebSocket security rejection: {}", ex.getMessage());
                    throw ex;
                } catch (Exception ex) {
                    log.error("Error processing WebSocket inbound message: {}", ex.getMessage(), ex);
                }

                return message;
            }
        });
    }

    private void handleConnect(StompHeaderAccessor accessor) {
        String authHeader = accessor.getFirstNativeHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);

            try {
                if (jwtService.isTokenValid(token)) {
                    String username = jwtService.extractUsername(token);
                    String role = jwtService.extractRole(token);

                    String roleWithPrefix = (role != null && role.startsWith("ROLE_")) ? role : "ROLE_" + role;
                    SimpleGrantedAuthority authority = new SimpleGrantedAuthority(roleWithPrefix);

                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(username, null, List.of(authority));

                    accessor.setUser(authentication);
                    log.debug("WebSocket STOMP authenticated user={} role={}", username, roleWithPrefix);
                } else {
                    log.warn("WebSocket STOMP connect with invalid or expired token");
                }
            } catch (Exception ex) {
                log.warn("WebSocket STOMP authentication failed: {}", ex.getMessage());
            }
        } else {
            log.debug("WebSocket STOMP connection attempt without Bearer token");
        }
    }

    private void handleSubscribe(StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        if (destination == null) {
            return;
        }

        // Validate protected industrial real-time topics
        if (destination.startsWith("/topic/")) {
            Authentication auth = (Authentication) accessor.getUser();
            if (auth == null || !auth.isAuthenticated()) {
                log.warn("Unauthorized WebSocket subscription attempt to destination={} (no authentication)", destination);
                throw new SecurityException("Authentication required to subscribe to " + destination);
            }

            boolean hasAccess = auth.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .anyMatch(r -> r.equals("ROLE_ADMIN")
                            || r.equals("ROLE_ENGINEER")
                            || r.equals("ROLE_OPERATOR")
                            || r.equals("ROLE_MANAGER"));

            if (!hasAccess) {
                log.warn("Forbidden WebSocket subscription attempt user={} to destination={}",
                        auth.getName(), destination);
                throw new SecurityException("Insufficient authority for subscription to " + destination);
            }

            log.debug("Authorized subscription user={} to destination={}", auth.getName(), destination);
        }
    }
}
