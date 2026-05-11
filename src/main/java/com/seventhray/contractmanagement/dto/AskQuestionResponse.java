package com.seventhray.contractmanagement.dto;

public class AskQuestionResponse {
    private String question;
    private String answer;
    private boolean matched;

    public AskQuestionResponse() {
    }

    public AskQuestionResponse(String question, String answer, boolean matched) {
        this.question = question;
        this.answer = answer;
        this.matched = matched;
    }

    public String getQuestion() {
        return question;
    }

    public void setQuestion(String question) {
        this.question = question;
    }

    public String getAnswer() {
        return answer;
    }

    public void setAnswer(String answer) {
        this.answer = answer;
    }

    public boolean isMatched() {
        return matched;
    }

    public void setMatched(boolean matched) {
        this.matched = matched;
    }
}

