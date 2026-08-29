# Registro retroativo de refeição por texto ou áudio

## Problem Statement

Hoje, a divergência de uma Refeição Planejada só pode ser registrada por fotografia no fluxo “Comi outra coisa”. O atleta frequentemente não está com o celular no momento em que come ou prepara a refeição e, mais tarde, perde a oportunidade de registrar o consumo. Isso deixa o diário incompleto e impede uma visão aproximada das calorias e dos macros consumidos no dia, mesmo quando o atleta consegue descrever o que comeu de memória.

O objetivo não é obter precisão clínica ou 100% de confiança. É oferecer uma estimativa suficientemente útil para orientar o restante do dia, como perceber que faltou proteína ou que o consumo de gordura já está elevado.

## Solution

Ampliar o fluxo “Comi outra coisa” no cartão da refeição planejada para aceitar três formas de entrada: foto, texto escrito e áudio. Texto e áudio serão processados como uma descrição da refeição. O áudio será transcrito e a transcrição poderá ser revisada antes da estimativa.

A IA deverá estimar os alimentos, porções, calorias, proteínas, carboidratos e gorduras. O atleta verá o resultado, poderá editar itens e quantidades, e só então confirmará o Consumo Real.

O Consumo Real substituirá o consumo anteriormente registrado para aquela refeição, com aviso explícito antes da confirmação. A Refeição Planejada poderá ser sobrescrita como referência do registro diário, mas o consumo real deverá continuar distinguível da prescrição original. Data, horário e nome da refeição serão editáveis. Refeições sem planejamento aparecerão normalmente no diário.

## User Stories

1. As an athlete, I want to describe what I ate in writing, so that I can register a meal after I have finished eating.
2. As an athlete, I want to record what I ate by audio, so that I can register a meal without typing a long description.
3. As an athlete, I want to edit the audio transcription before estimation, so that recognition mistakes do not become nutrition mistakes.
4. As an athlete, I want to choose between photo, text, and audio from “Comi outra coisa”, so that photo is not the only way to report a divergence.
5. As an athlete, I want the text/audio flow to start from the planned meal card, so that the meal, day, and context are already identified.
6. As an athlete, I want to describe common portions such as “uma colher de arroz” or “uma fatia de presunto”, so that I do not need to know exact grams.
7. As an athlete, I want the AI to infer plausible portions from ordinary language, so that an approximate record is easier than a manual nutrition calculation.
8. As an athlete, I want the AI to estimate calories, protein, carbohydrates, and fat for each food and for the whole meal, so that I can understand my daily intake.
9. As an athlete, I want estimates clearly labeled as estimates, so that I do not mistake them for laboratory measurements.
10. As an athlete, I want the result to communicate uncertainty or low confidence, so that I know when the estimate may vary substantially.
11. As an athlete, I want to review the estimated food list before saving, so that I can catch an omitted or misunderstood food.
12. As an athlete, I want to edit an estimated food description, so that the recorded meal reflects what I actually ate.
13. As an athlete, I want to edit the quantity or portion of each estimated food, so that I can correct the AI without starting over.
14. As an athlete, I want to remove an incorrectly inferred food, so that it does not affect my daily totals.
15. As an athlete, I want to add a food the AI missed, so that the final estimate includes the complete meal.
16. As an athlete, I want the meal totals to update after editing items or quantities, so that I can review the resulting consumption before confirmation.
17. As an athlete, I want to see the description or transcription used for the estimate, so that the result remains understandable and auditable.
18. As an athlete, I want to confirm the estimate explicitly, so that no AI proposal is recorded as consumption without my approval.
19. As an athlete, I want my real consumption to replace the planned consumption for that meal, so that the diary reflects what I actually ate rather than the prescribed plate.
20. As an athlete, I want the planned meal to remain available as a reference, so that I can compare adherence without losing the original prescription.
21. As an athlete, I want a warning when a consumption record already exists, so that I understand that confirming will replace the current record.
22. As an athlete, I want to cancel after seeing the replacement warning, so that an accidental correction does not overwrite my record.
23. As an athlete, I want to register breakfast, lunch, dinner, or a snack even when no meal was planned, so that the daily record is complete.
24. As an athlete, I want to choose a meal category from common options, so that the record is organized consistently.
25. As an athlete, I want to provide a custom meal name, so that the record describes my meal naturally.
26. As an athlete, I want to change the meal date, so that I can fill in forgotten meals from yesterday or an earlier day.
27. As an athlete, I want to change the meal time, so that the diary reflects when I actually ate rather than when I remembered to register.
28. As an athlete, I want retroactive meals to appear normally in the daily diary, so that they contribute to the same daily totals as meals recorded immediately.
29. As an athlete, I want the daily calorie and macro totals to update after confirming a retroactive estimate, so that I can decide what to eat later.
30. As an athlete, I want the system to preserve the source as text or audio estimate, so that I can distinguish it from table data, label data, or photo estimates.
31. As an athlete, I want audio processing failures to be communicated clearly, so that I can retry or use the transcription/text route.
32. As an athlete, I want AI estimation failures to leave my draft intact, so that I do not lose the description I entered.
33. As an athlete, I want invalid, empty, or excessively long descriptions rejected with actionable feedback, so that I know how to correct them.
34. As an athlete, I want the feature to work from a meal card regardless of whether I am recording today or a prior date, so that the entry point remains consistent.
35. As an athlete, I want the system to avoid inventing foods not supported by my description, so that an approximate record is still faithful to my memory.
36. As an athlete, I want the system to use my remaining daily targets as context without forcing the result to match them, so that estimates describe what I ate rather than what I should have eaten.

## Implementation Decisions

- Extend the existing “Comi outra coisa” entry point rather than creating a separate top-level flow.
- Reuse the existing meal-estimation contract for text (`refeicao-texto`) and add the missing operation implementation with a structured result containing meal name, items, estimated portions, calories, protein, carbohydrates, fat, confidence, and limitations.
- Treat audio as an input and transcription step that produces the same description consumed by the text-estimation operation. Do not create a separate nutrition-calculation model for audio.
- Display an intermediate review state after transcription and another review state after AI estimation, allowing correction before persistence.
- Preserve the existing “AI proposes, athlete confirms” rule used by photo registration.
- Reuse the existing editable meal/item model and macro-scaling behavior where possible, while allowing estimated items to be edited, removed, or supplemented before confirmation.
- Support meal category options and a free-form meal name. The user may change date and time before confirmation.
- When an existing consumption is found for the target meal, show a confirmation warning stating that the new record will replace the current one. Do not overwrite before explicit confirmation.
- Store the confirmed result as Consumo Real associated with the selected day, time, and meal identity. Preserve the Refeição Planejada as reference data rather than mutating its original prescription.
- Allow a retroactive record without a corresponding Refeição Planejada; it must render as a normal diary meal and participate in daily totals.
- Preserve input provenance (`estimativa-ia` with a text or audio-description origin) and show an estimate-specific confidence label. Never present the result as a measured nutritional value.
- Keep audio bytes ephemeral unless an existing product requirement says otherwise; persist the resulting transcription/estimate provenance needed for audit, not the recording by default.
- Validate and constrain user input, transcription output, AI output, date/time, and item quantities at the server boundary. The server must recalculate or validate persisted nutrition instead of trusting editable client payloads blindly.
- Revalidate the diary and nutrition-dependent screens after confirmation, following the existing meal-confirmation behavior.

## Testing Decisions

- The highest-value seam is the complete meal-registration flow: invoke the user-facing action with a selected meal/date/time and verify the persisted Consumo Real and resulting diary totals. Prefer this over testing private helper functions.
- Add domain-level contract tests for the `refeicao-texto` AI operation: valid structured estimates, required uncertainty/provenance, refusal of malformed provider output, and preservation of the user description.
- Add integration tests for replacement semantics: an existing consumption triggers the warning path, cancellation preserves the old record, and explicit confirmation replaces it while retaining the planned reference.
- Add integration tests for retroactive and unplanned meals, including custom names, category selection, and changed time/date.
- Add tests for item editing and total recalculation: changing, removing, and adding items must affect the final macros and calories shown and persisted.
- Add tests for audio transcription handoff: an audio input produces editable text; transcription failure is recoverable; the same text contract is then used for estimation.
- Add UI/E2E coverage for the card entry point and the complete text/audio review journey, including visible estimate labels and the replacement warning.
- Test external behavior and durable contracts, not component internals, CSS class names, provider prompt wording, or implementation-specific state variables.
- Follow prior art from the photo-registration tests, meal-confirmation integration tests, domain operation tests, and existing server-action validation tests.

## Out of Scope

- Clinical-grade nutritional measurement or guaranteed accuracy.
- Automatic adjustment of the nutrition plan or future prescriptions based on a divergence.
- Replacing photo estimation; photo remains available.
- Persistent storage of raw audio recordings unless a separate privacy/product decision is made.
- Automatic saving without review and explicit confirmation.
- Automatic inference of foods that are not supported by the description.
- Weekly coaching, trend analysis, or retrospective correction of all historical meals in one batch.
- A general-purpose voice assistant unrelated to meal registration.
- Changing the nutrition target calculation itself.

## Further Notes

The feature is intended to improve adherence to logging, not adherence to the exact prescribed plate. A low-confidence estimate that is recorded is more useful than a missing meal, provided its uncertainty and origin remain visible. The existing domain vocabulary defines Refeição Planejada, Consumo Real, Registro Retroativo, Estimativa por Descrição, and Divergência da Refeição Planejada; implementation and UI should use those distinctions consistently.
