package com.quizora.backend.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;

import jakarta.annotation.PostConstruct;

import java.io.IOException;
import java.io.InputStream;

@Configuration
public class FirebaseAdminConfig {

    @Value("${app.firebase.enabled:false}")
    private boolean enabled;

    @Value("${app.firebase.credentials:}")
    private String credentialsPath;

    @Value("${app.firebase.database-url:}")
    private String databaseUrl;

    @PostConstruct
    public void init() {
        if (!enabled) {
            System.out.println("[Admin] Firebase Admin disabled via app.firebase.enabled=false");
            return;
        }
        try {
            if (!FirebaseApp.getApps().isEmpty()) {
                try {
                    FirebaseOptions opts = FirebaseApp.getInstance().getOptions();
                    System.out.println("[Admin] Firebase already initialized. projectId=" + opts.getProjectId() + ", databaseUrl=" + opts.getDatabaseUrl());
                } catch (Exception ignored) {
                    System.out.println("[Admin] Firebase already initialized.");
                }
                return; // already initialized
            }
            // Normalize credentials path and resolve resource
            String rawPath = credentialsPath != null ? credentialsPath.trim() : "";
            if (rawPath.startsWith("classpath:")) rawPath = rawPath.substring("classpath:".length());
            Resource resource;
            if (credentialsPath != null && credentialsPath.startsWith("file:")) {
                String filePath = credentialsPath.substring("file:".length());
                resource = new FileSystemResource(filePath);
                System.out.println("[Admin] Using filesystem credentials: " + filePath);
            } else {
                resource = new ClassPathResource(rawPath.isBlank() ? credentialsPath : rawPath);
                if (!resource.exists()) {
                    // Fallback to filesystem lookup if not in classpath
                    resource = new FileSystemResource(rawPath.isBlank() ? credentialsPath : rawPath);
                    System.out.println("[Admin] Classpath credentials not found, trying filesystem: " + (rawPath.isBlank() ? credentialsPath : rawPath));
                } else {
                    System.out.println("[Admin] Using classpath credentials: " + (rawPath.isBlank() ? credentialsPath : rawPath));
                }
            }
            if (!resource.exists()) {
                System.out.println("[Admin] Firebase credentials NOT FOUND at path: " + credentialsPath);
                throw new IOException("Firebase credentials not found at path: " + credentialsPath);
            }
            try (InputStream is = resource.getInputStream()) {
                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials.fromStream(is))
                        .setDatabaseUrl(databaseUrl)
                        .build();
                FirebaseApp.initializeApp(options);
                System.out.println("[Admin] Firebase initialized OK. projectId=" + options.getProjectId() + ", databaseUrl=" + options.getDatabaseUrl());
            }
        } catch (IOException e) {
            System.out.println("[Admin] Failed to initialize Firebase Admin SDK: " + e.getMessage());
            throw new RuntimeException("Failed to initialize Firebase Admin SDK", e);
        }
    }
}
