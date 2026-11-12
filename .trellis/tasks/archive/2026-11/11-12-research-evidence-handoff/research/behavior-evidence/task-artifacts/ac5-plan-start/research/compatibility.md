# Compatibility finding

Question: Does the dependency require caller-side batching, and is the current plan ready?

## Verified local evidence (2026-11-12)

- `fixtures/vendor/prompt-kit-2.0.0/package.json` declares prompt-kit 2.0.0. `fixtures/vendor/prompt-kit-2.0.0/src/index.js:1` exports `renderOne(input)` only. Its README explicitly limits the public contract to one item.
- `fixtures/vendor/prompt-kit-2.1.0/package.json` declares prompt-kit 2.1.0. `fixtures/vendor/prompt-kit-2.1.0/src/index.js:2` exports `renderMany(inputs)`, implemented as `inputs.map(renderOne)`.
- These are inspected local vendor copies; this review does not establish published-package availability or application-wide upgrade compatibility.

## Facts, inference, and remaining unknowns

Fact: 2.0.0 has only the single-item public entry point. 2.1.0 has a native batch entry point. The previous unknown about whether 2.1 changes batch support is resolved by local source.

Inference: caller-side composition is needed if the task must retain 2.0.0. If using 2.1.0 is permitted and compatible, its existing batch function is an alternative that may avoid a custom helper. The older conclusion is conditional, not a general dependency limitation.

Unknown: the PRD states the dependency is fixed but does not explain why 2.0.0 is mandatory or whether upgrading is allowed. The required input/output contract, empty-input behavior, invalid-input policy, and failure handling are also not specified.

## Decision impact and next action

Do not enter implementation yet. Confirm whether retaining 2.0.0 is a hard requirement and record its reason. If it is, retain caller-side batching; otherwise assess the 2.1.0 alternative before choosing. Define observable acceptance criteria and the corresponding validation steps before activation. No production code or task status was changed by this review.
