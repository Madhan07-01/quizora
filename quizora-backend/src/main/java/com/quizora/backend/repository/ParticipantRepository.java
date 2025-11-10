package com.quizora.backend.repository;

import com.quizora.backend.model.Participant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ParticipantRepository extends JpaRepository<Participant, Long> {
    Optional<Participant> findByQuizIdAndName(Long quizId, String name);
    List<Participant> findByQuizId(Long quizId);
    long countByQuizId(Long quizId);
}
