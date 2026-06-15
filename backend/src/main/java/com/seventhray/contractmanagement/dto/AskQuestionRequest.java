package com.seventhray.contractmanagement.dto;

import jakarta.validation.constraints.NotBlank;

public class AskQuestionRequest {

    @NotBlank
    private String question;

    public String getQuestion() {
        return question;
    }

    public void setQuestion(String question) {
        this.question = question;
    }
}

