package com.quizora.backend.config;

import com.google.firebase.FirebaseApp;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Lightweight auth filter that verifies Firebase ID tokens on protected endpoints.
 *
 * Protected patterns (by default):
 * - POST /api/quizzes/**
 * - DELETE /api/quizzes/**
 *
 * Public (examples):
 * - GET /api/quizzes/code/**
 * - GET /api/quizzes/all
 */
@Component
@Order(10)
public class FirebaseAuthFilter extends OncePerRequestFilter {

    private static final AntPathMatcher matcher = new AntPathMatcher();

    private static final List<String> PROTECTED_PATTERNS = List.of(
            "/api/quizzes/**",
            "/api/admin/**"
    );

    private static final List<String> PUBLIC_EXCEPTIONS = List.of(
            "/api/quizzes/code/**",
            "/api/quizzes/all",
            "/api/quizzes/*/leaderboard",
            "/api/quizzes/*/results",
            "/api/quizzes/*/participants"
    );

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        // Always allow CORS preflight to pass through
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) return true;
        String path = request.getRequestURI();
        // Only consider our API namespace
        boolean underApi = PROTECTED_PATTERNS.stream().anyMatch(p -> matcher.match(p, path));
        if (!underApi) return true;

        // Allow unauthenticated join requests
        if (matcher.match("/api/quizzes/join", path)) return true;

        // Allow read-only GETs without auth
        if (HttpMethod.GET.matches(request.getMethod())) return PUBLIC_EXCEPTIONS.stream().anyMatch(p -> matcher.match(p, path));

        return false; // filter for everything else under protected patterns
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        // Safety: never block preflight here
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        // If Firebase is not initialized (e.g., no credentials in dev), skip verification
        try {
            if (FirebaseApp.getApps() == null || FirebaseApp.getApps().isEmpty()) {
                filterChain.doFilter(request, response);
                return;
            }
        } catch (IllegalStateException ignored) {
            filterChain.doFilter(request, response);
            return;
        }

        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            unauthorized(request, response, "Missing Authorization header");
            return;
        }
        String token = authHeader.substring(7);
        try {
            FirebaseToken decoded = FirebaseAuth.getInstance().verifyIdToken(token);
            // Attach useful attributes for controllers/services if needed
            request.setAttribute("firebaseUid", decoded.getUid());
            request.setAttribute("firebaseEmail", decoded.getEmail());
            filterChain.doFilter(request, response);
        } catch (FirebaseAuthException e) {
            unauthorized(request, response, "Invalid token: " + e.getAuthErrorCode());
        }
    }

    private void unauthorized(HttpServletRequest request, HttpServletResponse response, String message) throws IOException {
        // Add CORS headers on error path; echo origin to be compatible with allowCredentials=true
        String origin = request.getHeader("Origin");
        if (origin != null && !origin.isBlank()) {
            response.setHeader("Access-Control-Allow-Origin", origin);
            response.setHeader("Vary", "Origin");
            response.setHeader("Access-Control-Allow-Credentials", "true");
            response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
        }
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.getWriter().write("{\"error\":\"" + message + "\"}");
    }
}
