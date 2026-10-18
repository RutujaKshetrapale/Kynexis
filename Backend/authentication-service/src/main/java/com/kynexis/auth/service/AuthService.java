package com.kynexis.auth.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.kynexis.auth.common.exception.BusinessValidationException;
import com.kynexis.auth.dto.LoginRequest;
import com.kynexis.auth.dto.LoginResponse;
import com.kynexis.auth.dto.RegisterRequest;
import com.kynexis.auth.dto.UserResponse;
import com.kynexis.auth.entity.Role;
import com.kynexis.auth.entity.User;
import com.kynexis.auth.repository.UserRepository;
import com.kynexis.auth.security.JwtService;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public UserResponse register(RegisterRequest request) {
        log.info("Registering user username={} email={}", request.getUsername(), request.getEmail());

        if (userRepository.existsByUsername(request.getUsername())) {
            log.warn("Registration failed username={}: username already exists", request.getUsername());
            throw new BusinessValidationException("USERNAME ALREADY EXISTS: " + request.getUsername());
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            log.warn("Registration failed email={}: email already exists", request.getEmail());
            throw new BusinessValidationException("EMAIL ALREADY EXISTS: " + request.getEmail());
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.OPERATOR)
                .active(true)
                .build();

        User savedUser = userRepository.save(user);
        log.info("User registered successfully id={} username={} role={}", savedUser.getId(), savedUser.getUsername(), savedUser.getRole());

        return UserResponse.builder()
                .id(savedUser.getId())
                .username(savedUser.getUsername())
                .email(savedUser.getEmail())
                .role(savedUser.getRole().name())
                .active(savedUser.isActive())
                .build();
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        log.info("Login attempt username={}", request.getUsername());

        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> {
                    log.warn("Login failed username={}: invalid username or password", request.getUsername());
                    return new BusinessValidationException("INVALID USERNAME OR PASSWORD");
                });

        if (!user.isActive()) {
            log.warn("Login failed username={}: user account inactive", request.getUsername());
            throw new BusinessValidationException("USER ACCOUNT IS INACTIVE");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            log.warn("Login failed username={}: invalid username or password", request.getUsername());
            throw new BusinessValidationException("INVALID USERNAME OR PASSWORD");
        }

        String token = jwtService.generateToken(user.getUsername(), user.getRole().name());
        log.info("Login successful username={} role={}", user.getUsername(), user.getRole().name());

        return LoginResponse.builder()
                .token(token)
                .username(user.getUsername())
                .role(user.getRole().name())
                .build();
    }
}
