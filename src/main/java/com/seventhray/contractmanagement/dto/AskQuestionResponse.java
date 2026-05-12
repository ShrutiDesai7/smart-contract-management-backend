package com.seventhray.contractmanagement.dto;

import java.util.List;

public class AskQuestionResponse {
    private String answer;
    private List<String> evidence;

    public AskQuestionResponse() {
    }

    public AskQuestionResponse(String answer, List<String> evidence) {
        this.answer = answer;
        this.evidence = evidence;
    }

    public String getAnswer() {
        return answer;
    }

    public void setAnswer(String answer) {
        this.answer = answer;
    }

    public List<String> getEvidence() {
        return evidence;
    }

    public void setEvidence(List<String> evidence) {
        this.evidence = evidence;
    }
}
