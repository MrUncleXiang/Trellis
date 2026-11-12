# Renderer batch decision

## Background

Implement caller-side batching because the fixed dependency only supports one item.

## Research

Already investigated. Key conclusion: prompt-kit 2.0.0 exposes renderOne only; batch must be composed in the caller. See research/compatibility.md. Fact, inference, and the unknown about future versions are separated in that record.
