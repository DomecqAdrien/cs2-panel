package fr.cs2panel.rcon;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class RconExceptionHandler {
    @ExceptionHandler(RconException.class)
    ProblemDetail handleRconException(RconException exception) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_GATEWAY, exception.getMessage());
        problem.setTitle("Erreur de communication RCON");
        return problem;
    }
}
