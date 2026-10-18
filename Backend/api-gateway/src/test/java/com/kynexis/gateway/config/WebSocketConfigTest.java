package com.kynexis.gateway.config;

import static org.mockito.Mockito.*;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.StompWebSocketEndpointRegistration;

import com.kynexis.common.security.JwtService;

class WebSocketConfigTest {

    @Test
    @DisplayName("Verify WebSocket message broker configuration with /topic broker and /app prefix")
    void testConfigureMessageBroker() {
        JwtService jwtService = mock(JwtService.class);
        WebSocketConfig config = new WebSocketConfig(jwtService, "http://localhost:5173,http://localhost:3000");
        MessageBrokerRegistry registry = mock(MessageBrokerRegistry.class);

        when(registry.enableSimpleBroker("/topic")).thenReturn(null);
        when(registry.setApplicationDestinationPrefixes("/app")).thenReturn(registry);

        config.configureMessageBroker(registry);

        verify(registry).enableSimpleBroker("/topic");
        verify(registry).setApplicationDestinationPrefixes("/app");
    }

    @Test
    @DisplayName("Verify WebSocket STOMP endpoint registration with allowed origin patterns")
    void testRegisterStompEndpoints() {
        JwtService jwtService = mock(JwtService.class);
        WebSocketConfig config = new WebSocketConfig(jwtService, "http://localhost:5173,http://localhost:3000");
        StompEndpointRegistry registry = mock(StompEndpointRegistry.class);
        StompWebSocketEndpointRegistration registration = mock(StompWebSocketEndpointRegistration.class);

        when(registry.addEndpoint("/ws")).thenReturn(registration);
        when(registration.setAllowedOriginPatterns("http://localhost:5173", "http://localhost:3000")).thenReturn(registration);

        config.registerStompEndpoints(registry);

        verify(registry, times(2)).addEndpoint("/ws");
        verify(registration).withSockJS();
    }
}
