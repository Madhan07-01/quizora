package com.quizora.backend.repository;

import com.quizora.backend.model.Quiz;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface QuizRepository extends JpaRepository<Quiz, Long> {
    Optional<Quiz> findByQuizCode(String quizCode);
    boolean existsByQuizCode(String quizCode);
    List<Quiz> findByCreatorUidOrderByCreatedAtDesc(String creatorUid);
}
