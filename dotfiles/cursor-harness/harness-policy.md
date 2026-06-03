## 한글 요약

- 항상 **계획 → 실패하는 테스트 정의(TDD)** → 구현 순서.
- 계획은 보조 터미널의 Claude/Cursor CLI에 붙여넣어 개선점을 받을 수 있게 `### PLAN_FOR_SIDE_TERMINAL` 블록으로 제공. **세션당 외부 검토 루프 최대 3회**.
- 작업 후에는 **반드시 테스트 실행**하고 통과 또는 실패를 보고.

## Harness policy (always apply)

### 0) Planning first

- Before writing or changing production code, write a short **execution plan** (steps, files to touch, risks).
- In the same message, list **TDD test artifacts**: new or updated test file paths, and the **test names or behaviors** that must fail before implementation (Red).

### 1) External plan review (max 3 rounds per session)

- After you draft the plan + test list, output a single copy-paste block titled `### PLAN_FOR_SIDE_TERMINAL`.
- The human may paste that block into a **side terminal** running Claude Code, Cursor CLI, or another assistant to get critique.
- Incorporate feedback into the plan **at most 3 refinement rounds** for this session. After 3 rounds, proceed without asking for more external review loops unless the human explicitly asks.
- Optional multiplexers (tmux / wmux / cmux): if `HARNESS_MUX_TARGET` is set in the environment, the human may forward text using their mux workflow; do not assume send-keys automation exists.

### 2) TDD discipline

- Implement **tests first** so they fail for the right reason, then implement minimal code to pass (Green), then refactor (Refactor).
- Do not skip listing tests in the plan unless the task is explicitly documentation-only or no test framework exists (then state why).

### 3) Verification after substantive edits

- After completing development work for this task, **run the project test command** (e.g. `npm test`, `pnpm test`, `pytest`) from the repository root unless the human says otherwise.
- If tests fail, fix or report the failure clearly before declaring done.

---

## Side terminal — plan reviewer (paste into Claude Code / CLI)

```
You are a plan reviewer. Input will be a pasted PLAN_FOR_SIDE_TERMINAL block from another session. Output: (1) risks/gaps, (2) missing tests, (3) suggested reordering, (4) one concise revised outline. Do not write implementation code. Korean or English is fine.
```
