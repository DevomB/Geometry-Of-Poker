#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

const target = "/tmp/poker-calculations/native/binding_init.cpp";
let source = readFileSync(target, "utf8");

source = source.replace(
  /void init_binding\(Napi::Env env\) \{\s+for \(int i = 0; i < 10; \+\+i\) \{\s+g_hand_rank_strings\[static_cast<std::size_t>\(i\)\] =\s+Napi::Persistent\(Napi::String::New\(env, kHandRankNames\[i\]\)\);\s+\}\s+\}/,
  "void init_binding(Napi::Env env) {\n    (void)env;\n}",
);

source = source.replace(
  "return g_hand_rank_strings[static_cast<std::size_t>(idx)].Value();",
  "return Napi::String::New(env, kHandRankNames[idx]);",
);

if (!source.includes("(void)env;") || !source.includes("Napi::String::New(env, kHandRankNames[idx])")) {
  throw new Error("Failed to apply poker-calculations native init hotfix.");
}

writeFileSync(target, source);
console.log("Applied poker-calculations native init hotfix inside worker image build.");
