# Renderer batch decision

## Background

The current proposal is caller-side batching for prompt-kit 2.0.0. The requirement to retain that version needs confirmation before implementation.

## Research

Reviewed local sources on 2026-11-12; see [compatibility finding](research/compatibility.md). Version 2.0.0 exposes only `renderOne`; the local 2.1.0 copy also exposes `renderMany`. The earlier unknown about 2.1 batch support is resolved. Caller-side batching is therefore conditional on retaining 2.0.0, not the only demonstrated path.

The local evidence remains applicable to these exact vendor versions; it does not establish upgrade compatibility for the application.

## Planning review

Not ready for implementation. Confirm why 2.0.0 must be retained or whether 2.1.0 may be considered. Define the batch input/output contract and acceptance criteria, including empty input, ordering, invalid input, and failure behavior. Then align the design and implementation plan with the chosen path and specify reproducible validation commands. Keep task status `planning` until those decisions are resolved and reviewed.
