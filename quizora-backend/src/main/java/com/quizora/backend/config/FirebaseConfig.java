package com.quizora.backend.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;

import java.io.IOException;
import java.io.InputStream;

@Configuration
@ConditionalOnProperty(prefix = "app.firebase", name = "enabled", havingValue = "true", matchIfMissing = false)
public class FirebaseConfig {

    private final ResourceLoader resourceLoader;

    @Value("${app.firebase.credentials:classpath:firebase-service-account.json}")
    private String credentialsLocation;

    @Value("${app.firebase.database-url:https://YOUR_PROJECT_ID.firebaseio.com}")
    private String databaseUrl;

    public FirebaseConfig(ResourceLoader resourceLoader) {
        this.resourceLoader = resourceLoader;
    }

    @PostConstruct
    public void init() throws IOException {
        Resource resource = resourceLoader.getResource(credentialsLocation);
        if (!resource.exists()) {
            System.out.println("[Firebase] Credentials not found at " + credentialsLocation + ", skipping initialization.");
            return;
        }

        try (InputStream serviceAccount = resource.getInputStream()) {
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .setDatabaseUrl(databaseUrl)
                    .build();
            if (FirebaseApp.getApps().isEmpty()) {
                FirebaseApp.initializeApp(options);
                System.out.println("[Firebase] Initialized using " + credentialsLocation);
            }
        }
    }
}
