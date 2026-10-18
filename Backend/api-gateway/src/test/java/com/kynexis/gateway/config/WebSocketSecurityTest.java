package com.kynexis.gateway.config;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import com.kynexis.common.security.JwtService;

class WebSocketSecurityTest {

    private JwtService jwtService;
    private WebSocketConfig webSocketConfig;
    private ChannelInterceptor interceptor;

    @BeforeEach
    void setUp() {
        jwtService = mock(JwtService.class);
        webSocketConfig = new WebSocketConfig(jwtService, "http://localhost:5173");

        ChannelRegistration registration = mock(ChannelRegistration.class);
        ArgumentCaptor<ChannelInterceptor> captor = ArgumentCaptor.forClass(ChannelInterceptor.class);
        when(registration.interceptors(captor.capture())).thenReturn(registration);

        webSocketConfig.configureClientInboundChannel(registration);
        interceptor = captor.getValue();
        assertNotNull(interceptor);
    }

    @Test
    @DisplayName("STOMP CONNECT with valid Bearer token sets authenticated User on accessor")
    void testConnectWithValidToken() {
        when(jwtService.isTokenValid("valid-jwt")).thenReturn(true);
        when(jwtService.extractUsername("valid-jwt")).thenReturn("operator1");
        when(jwtService.extractRole("valid-jwt")).thenReturn("OPERATOR");

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setNativeHeader("Authorization", "Bearer valid-jwt");
        accessor.setLeaveMutable(true);

        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
        MessageChannel channel = mock(MessageChannel.class);

        Message<?> result = interceptor.preSend(message, channel);
        assertNotNull(result);

        StompHeaderAccessor resultAccessor = StompHeaderAccessor.wrap(result);
        Authentication user = (Authentication) resultAccessor.getUser();
        assertNotNull(user);
        assertEquals("operator1", user.getName());
        assertTrue(user.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_OPERATOR")));
    }

    @Test
    @DisplayName("STOMP CONNECT with invalid token does not authenticate user")
    void testConnectWithInvalidToken() {
        when(jwtService.isTokenValid("invalid-jwt")).thenReturn(false);

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setNativeHeader("Authorization", "Bearer invalid-jwt");
        accessor.setLeaveMutable(true);

        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
        MessageChannel channel = mock(MessageChannel.class);

        Message<?> result = interceptor.preSend(message, channel);
        assertNotNull(result);

        StompHeaderAccessor resultAccessor = StompHeaderAccessor.wrap(result);
        assertNull(resultAccessor.getUser());
    }

    @Test
    @DisplayName("STOMP SUBSCRIBE to /topic/alerts by authorized user succeeds")
    void testSubscribeAuthorized() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/alerts");
        accessor.setUser(new UsernamePasswordAuthenticationToken(
                "engineer1", null, List.of(new SimpleGrantedAuthority("ROLE_ENGINEER"))));
        accessor.setLeaveMutable(true);

        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
        MessageChannel channel = mock(MessageChannel.class);

        assertDoesNotThrow(() -> interceptor.preSend(message, channel));
    }

    @Test
    @DisplayName("STOMP SUBSCRIBE to /topic/telemetry by unauthenticated user throws SecurityException")
    void testSubscribeUnauthenticatedThrowsSecurityException() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/telemetry");
        accessor.setLeaveMutable(true);

        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
        MessageChannel channel = mock(MessageChannel.class);

        SecurityException ex = assertThrows(SecurityException.class, () -> interceptor.preSend(message, channel));
        assertTrue(ex.getMessage().contains("Authentication required"));
    }

    @Test
    @DisplayName("STOMP SUBSCRIBE by user with unauthorized role throws SecurityException")
    void testSubscribeForbiddenRoleThrowsSecurityException() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/alerts");
        accessor.setUser(new UsernamePasswordAuthenticationToken(
                "guest1", null, List.of(new SimpleGrantedAuthority("ROLE_GUEST"))));
        accessor.setLeaveMutable(true);

        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
        MessageChannel channel = mock(MessageChannel.class);

        SecurityException ex = assertThrows(SecurityException.class, () -> interceptor.preSend(message, channel));
        assertTrue(ex.getMessage().contains("Insufficient authority"));
    }
}
