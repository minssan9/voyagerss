/**
 * Common prompt utilities for AI providers
 */

/**
 * Generate quiz prompt
 * @param {string} knowledgeArea - Knowledge area for the quiz
 * @param {Object|null} messageGenerator - Optional message generator
 * @returns {string} Generated prompt
 */
function generateQuizPrompt(knowledgeArea, messageGenerator = null) {
  // Use messageGenerator if available
  if (messageGenerator && typeof messageGenerator.generateQuizPrompt === 'function') {
    return messageGenerator.generateQuizPrompt(knowledgeArea);
  }

  // Fallback prompt if MessageGenerator is not available
  return `항공 전문가로서 "${knowledgeArea}" 주제에 대한 상세한 4지 선다 문제를 1개 만들어 주세요.

요구사항:
1. 문제는 사업용 조종사 수준의 전문적인 내용
2. 4개의 선택지 (A, B, C, D)와 명확한 정답 1개
3. 각 선택지는 현실적이고 그럴듯한 내용
4. 정답 해설도 포함
5. 실무에 적용 가능한 실용적 내용
6. 전체 내용은 1000자 이내

다음 형식으로 답변해 주세요:
**문제:**
[문제 내용]

**선택지:**
A) [선택지 1]
B) [선택지 2]
C) [선택지 3]
D) [선택지 4]

**정답:** [정답 번호]

**해설:**
[정답 해설 및 추가 설명]`;
}

module.exports = {
  generateQuizPrompt
};
