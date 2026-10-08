package com.example.demo.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.example.demo.dto.LoginRequest;
import com.example.demo.dto.LoginResponse;
import com.example.demo.dto.RegisterRequest;
import com.example.demo.entity.Role;
import com.example.demo.entity.User;
import com.example.demo.repository.UserRepository;
import com.example.demo.security.JwtService;

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

    public User register(RegisterRequest request) {

        log.info("Registering user username={} email={}", request.getUsername(), request.getEmail());

        if (userRepository.existsByUsername(request.getUsername())) {
            log.warn("Registration failed username={}: username already exists", request.getUsername());
            throw new RuntimeException(
                    "USERNAME ALREADY EXISTS: "
                    + request.getUsername()
            );
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            log.warn("Registration failed email={}: email already exists", request.getEmail());
            throw new RuntimeException(
                    "EMAIL ALREADY EXISTS: "
                    + request.getEmail()
            );
        }

        User user = new User();

        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());

        user.setPassword(
                passwordEncoder.encode(request.getPassword())
        );

        // New users cannot choose ADMIN/ENGINEER/MANAGER.
        // Default role is OPERATOR.
        user.setRole(Role.OPERATOR);

        user.setActive(true);

        User savedUser = userRepository.save(user);
        log.info("User registered successfully username={} role={}", savedUser.getUsername(), savedUser.getRole());
        return savedUser;
    }

    public LoginResponse login(LoginRequest request) {

        log.info("Login attempt username={}", request.getUsername());

        User user = userRepository
                .findByUsername(request.getUsername())
                .orElseThrow(() -> {
                    log.warn("Login failed username={}: invalid username or password", request.getUsername());
                    return new RuntimeException("INVALID USERNAME OR PASSWORD");
                });

        if (!user.isActive()) {
            log.warn("Login failed username={}: user account inactive", request.getUsername());
            throw new RuntimeException(
                    "USER ACCOUNT IS INACTIVE"
            );
        }

        if (!passwordEncoder.matches(
                request.getPassword(),
                user.getPassword())) {

            log.warn("Login failed username={}: invalid username or password", request.getUsername());
            throw new RuntimeException(
                    "INVALID USERNAME OR PASSWORD"
            );
        }

        String token = jwtService.generateToken(user);
        log.info("Login successful username={} role={}", user.getUsername(), user.getRole().name());

        return new LoginResponse(
                token,
                user.getUsername(),
                user.getRole().name()
        );
    }
}