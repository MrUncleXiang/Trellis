# Compatibility finding

Question: Can the local renderer accept batch input?

Source: fixtures/vendor/prompt-kit-2.0.0, version 2.0.0 (historical snapshot), src/index.js exports renderOne only.

Fact: the public API accepts one item. Limitation: no batch path in this version.

Inference: the caller must loop over items. Unknown: whether 2.1 changes this; current decision uses 2.0.0.

Decision impact: implement caller-side batching for version 2.0.0.
