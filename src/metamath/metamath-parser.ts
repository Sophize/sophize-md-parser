import { of } from "rxjs";
import { map } from "rxjs/operators";
import {
  Language,
  PropositionPointer,
  ResourcePointer,
} from "sophize-datamodel";
import { ILatexDefsFetcher } from "../ast-expander";
import {
  MetamathArgument,
  MetamathObject,
  MetamathParseError,
  MetamathProposition,
  MetamathStmt,
  ProofStep,
} from "./metamath-datamodel";

const START_D = "$d";
const START_E = "$e";
const START_P = "$p";
const START_C = "$(";
const END_DEP = "$.";
const END_C = "$)";
const START_PROOF = "$=";

const SPECIAL_TOKENS = [
  START_D,
  START_E,
  START_P,
  START_C,
  END_DEP,
  END_C,
  START_PROOF,
];
const ARGUMENT_PREFIX = "ARGUMENT";

enum ParseState {
  EASY,
  HAVE_TAG,
  STARTED_D,
  STARTED_E,
  STARTED_P,
  STARTED_C,
  STARTED_PROOF,
  ERROR,
}

class State {
  pendingTokenList = [];
  tag = "";
  state = ParseState.EASY;

  statement = new MetamathProposition();
  errorStatement = "";
  lookupTermsConsumed = 0;

  constructor(private lookupTerms: ResourcePointer[]) {}

  handleToken(token: string) {
    switch (this.state) {
      case ParseState.EASY:
        this.handleEasy(token);
        break;
      case ParseState.HAVE_TAG:
        this.handleHaveTag(token);
        break;
      case ParseState.STARTED_D:
        this.handleStartedD(token);
        break;
      case ParseState.STARTED_E:
        this.handleStartedE(token);
        break;
      case ParseState.STARTED_P:
        this.handleStartedP(token);
        break;
      case ParseState.STARTED_C:
        this.handleStartedC(token);
        break;
      case ParseState.STARTED_PROOF:
        this.handleStartedProof(token);
        break;
      case ParseState.ERROR:
        break;
    }
  }

  getStatement() {
    const completableStates = [
      ParseState.STARTED_D,
      ParseState.STARTED_E,
      ParseState.STARTED_P,
      ParseState.STARTED_PROOF,
    ];
    if (completableStates.indexOf(this.state) != -1) {
      this.handleToken(END_DEP);
    }

    if (this.state == ParseState.ERROR) return null as MetamathProposition;
    return this.statement;
  }

  handleEasy(token: string) {
    if (token == START_D) {
      this.state = ParseState.STARTED_D;
    } else if (token == START_E) {
      this.state = ParseState.STARTED_E;
    } else if (token == START_P) {
      this.state = ParseState.STARTED_P;
    } else if (token == START_C) {
      this.state = ParseState.STARTED_C;
    } else if (SPECIAL_TOKENS.indexOf(token) !== -1) {
      this.state = ParseState.ERROR;
      this.errorStatement = "Unexpected token: " + token;
    } else {
      this.state = ParseState.HAVE_TAG;
      this.tag = token;
    }
  }

  handleHaveTag(token: string) {
    if (token == START_E) {
      this.state = ParseState.STARTED_E;
    } else if (token == START_P) {
      this.state = ParseState.STARTED_P;
    } else {
      this.state = ParseState.ERROR;
      this.errorStatement = "Unexpected token: " + token;
    }
  }

  handleStartedD(token: string) {
    if (token == END_DEP) {
      const expression = this.consumePendingTokenList();

      this.statement.distinctVars.distinctGroups.push(expression);
      this.statement.distinctVars.lookupTerms.push(
        ...this.consumeLookupTerms(expression)
      );
      this.state = ParseState.EASY;
    } else if (SPECIAL_TOKENS.indexOf(token) !== -1) {
      this.state = ParseState.ERROR;
      this.errorStatement = "Unexpected token: " + token;
    } else {
      this.addPendingToken(token);
    }
  }

  handleStartedE(token: string) {
    if (token == END_DEP) {
      const expression = this.consumePendingTokenList();
      this.statement.hypotheses.push(
        new MetamathStmt(
          this.tag,
          expression,
          this.consumeLookupTerms(expression)
        )
      );
      this.tag = "";
      this.state = ParseState.EASY;
    } else if (SPECIAL_TOKENS.indexOf(token) !== -1) {
      this.state = ParseState.ERROR;
      this.errorStatement = "Unexpected token: " + token;
    } else {
      this.addPendingToken(token);
    }
  }

  handleStartedP(token: string) {
    if (token == END_DEP) {
      if (!this.statement.assrt.isEmpty()) {
        this.state = ParseState.ERROR;
        this.errorStatement = "Two assert statements found";
        return;
      }
      const expression = this.consumePendingTokenList();
      this.statement.assrt = new MetamathStmt(
        this.tag,
        expression,
        this.consumeLookupTerms(expression),
        true
      );
      this.tag = "";
      this.state = ParseState.EASY;
    } else if (token === START_PROOF) {
      this.state = ParseState.STARTED_PROOF;
    } else if (SPECIAL_TOKENS.indexOf(token) !== -1) {
      this.state = ParseState.ERROR;
      this.errorStatement = "Unexpected token: " + token;
    } else {
      this.addPendingToken(token);
    }
  }

  handleStartedC(token: string) {
    if (token == END_C) {
      this.state = ParseState.EASY;
    }
  }

  handleStartedProof(token: string) {
    if (token == END_DEP) {
      if (!this.statement.assrt.isEmpty()) {
        this.state = ParseState.ERROR;
        this.errorStatement = "Two assert statements found";
        return;
      }
      const expression = this.consumePendingTokenList();
      this.statement.assrt = new MetamathStmt(
        this.tag,
        expression,
        this.consumeLookupTerms(expression),
        true
      );
      this.tag = "";
      this.state = ParseState.EASY;
    } else if (SPECIAL_TOKENS.indexOf(token) !== -1) {
      this.state = ParseState.ERROR;
      this.errorStatement = "Unexpected token: " + token;
    }
  }

  private addPendingToken(sym: string) {
    this.pendingTokenList.push(sym);
  }

  private consumePendingTokenList() {
    const retVal = this.pendingTokenList;
    this.pendingTokenList = [];
    return retVal;
  }

  consumeLookupTerms(expression: string[]) {
    let toReturn: ResourcePointer[];
    [this.lookupTermsConsumed, toReturn] =
      MetamathStmt.getLookupTermsForExpression(
        expression,
        this.lookupTerms,
        this.lookupTermsConsumed
      );
    return toReturn;
  }
}

export function metamathToMarkdown(
  input: string,
  lookupTerms: ResourcePointer[],
  getLatexDefs: ILatexDefsFetcher
) {
  const parsed: MetamathObject = parseMetamathInput(input, lookupTerms);
  if (!getLatexDefs) {
    getLatexDefs = (_, k) => of(k);
  }

  return getLatexDefs(Language.MetamathSetMm, parsed.symList()).pipe(
    map((latexDefs: string[]) => parsed.toMarkdown(latexDefs)[0])
  );
}

function parseMetamathInput(input: string, lookupTerms: ResourcePointer[]) {
  if (input.startsWith(ARGUMENT_PREFIX)) {
    return parseMetamathArgument(input, lookupTerms, null);
  }
  const tokens = input.match(/\S+/g) || [];
  const state = new State(lookupTerms);
  for (const token of tokens) {
    state.handleToken(token);
    if (state.state == ParseState.ERROR) break;
  }
  const statement = state.getStatement();
  if (!statement) {
    if (tokens.some((token) => SPECIAL_TOKENS.indexOf(token) != -1))
      return new MetamathParseError(state.errorStatement);
    return new MetamathProposition(
      [],
      new MetamathStmt("", tokens, lookupTerms, true)
    );
  }
  return statement;
}

export function parseMetamathArgument(
  argText: string,
  lookupTerms?: ResourcePointer[],
  contextPtr?: ResourcePointer
): MetamathArgument {
  if (!argText.startsWith(ARGUMENT_PREFIX)) return null;

  argText = argText.substr(ARGUMENT_PREFIX.length).trim();
  const hasDummyVars = !argText.startsWith("|");
  const headerSize = hasDummyVars ? 3 : 2;
  const lines = argText.match(/[^\r\n]+/g).filter((line) => line.trim());
  if (!lines || lines.length <= headerSize)
    return MetamathArgument.EMPTY_ARGUMENT;
  const dummyVars = hasDummyVars ? lines[0].match(/\S+/g) : [];
  const numSteps = lines.length - headerSize;
  const proofSteps: ProofStep[] = [];
  let stepIndex = 0;
  const numDummyVarsLookupTerms = Math.min(
    dummyVars.length,
    lookupTerms.length
  );
  let consumedLookupTerms = numDummyVarsLookupTerms;

  for (; stepIndex < numSteps; stepIndex++) {
    const line = lines[stepIndex + headerSize];
    if (!line.startsWith("|")) break;

    const parts = getStepParts(line);
    if (parts.length !== 4 || +parts[0] !== stepIndex + 1) {
      console.log("error in line: " + line);
      return MetamathArgument.EMPTY_ARGUMENT;
    }
    const hypNoList = parts[1].trim().split(/[ ,]+/);
    const hypUsedIndex = [];
    for (const hypNo of hypNoList) {
      if (hypNo.trim().length == 0) continue;
      const hypIndex = +hypNo.trim() - 1;
      if (hypIndex < 0 || hypIndex > numSteps) {
        console.log("index error: " + hypNoList + " in line: " + line);
        return MetamathArgument.EMPTY_ARGUMENT;
      }
      hypUsedIndex.push(+hypNo.trim() - 1);
    }

    const reference = parts[2].trim();
    const expression = parts[3].trim().match(/\S+/g);
    let exprLookupTerms: ResourcePointer[];
    [consumedLookupTerms, exprLookupTerms] =
      MetamathStmt.getLookupTermsForExpression(
        expression,
        lookupTerms,
        consumedLookupTerms
      );
    let propRef = null;
    let hypRef = null;
    if (!reference.startsWith("#")) {
      hypRef = reference;
    } else {
      const defaultDatasetId = contextPtr ? contextPtr.datasetId : "metamath";
      propRef = PropositionPointer.fromString(
        reference.substr(1),
        defaultDatasetId
      );
    }
    proofSteps.push(
      new ProofStep(
        stepIndex,
        hypUsedIndex,
        hypRef,
        propRef,
        expression,
        exprLookupTerms
      )
    );
  }
  const additionalArgText = lines.slice(stepIndex + headerSize).join("\n");
  return new MetamathArgument(
    dummyVars,
    lookupTerms.slice(0, numDummyVarsLookupTerms),
    proofSteps,
    additionalArgText
  );
}

function getStepParts(step: string) {
  const parts = [];
  let partStart = step.indexOf("|") + 1;
  let partEnd = step.indexOf(" |", partStart);
  for (let i = 0; i < 3; i++) {
    parts.push(step.substring(partStart, partEnd).trim());
    partStart = partEnd + 2;
    partEnd = step.indexOf(" |", partStart);
    if (partStart == -1 || partEnd == -1) return [];
  }
  partEnd = step.lastIndexOf("|") - 1;
  parts.push(step.substring(partStart, partEnd).trim());
  return parts;
}
