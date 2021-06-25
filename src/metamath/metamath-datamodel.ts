import { PropositionPointer, ResourcePointer } from 'sophize-datamodel';

export interface MetamathObject {
  toMarkdown(latexDefs: string[]): [string, string[]];
  symList(): string[];
}

export class MetamathParseError implements MetamathObject {
  constructor(public parseError: string) {}
  toMarkdown(latexDefs: string[]): [string, string[]] {
    return [this.parseError, latexDefs];
  }

  symList() {
    return [];
  }
}

export class MetamathStmt implements MetamathObject {
  static EMPTY_STMT() {
    return new MetamathStmt('', [], []);
  }
  static readonly NON_TERM_CHARS = ['(', ')', '|-', 'wff', 'class'];

  constructor(
    public tag: string,
    public formula: string[],
    public lookupTerms: ResourcePointer[],
    public isAssrt: boolean = false
  ) {}

  toMarkdown(latexDefs: string[]): [string, string[]] {
    let lookupTermIndex = 0;
    let mdString = this.getTagDisplay();
    for (let i = 0; i < this.formula.length; i++) {
      const sym = this.formula[i];

      let term: ResourcePointer = null;
      if (MetamathStmt.NON_TERM_CHARS.indexOf(sym) === -1) {
        if (lookupTermIndex < this.lookupTerms.length) {
          term = this.lookupTerms[lookupTermIndex];
          lookupTermIndex++;
        }
      }
      mdString += getDisplayPhrase(term, latexDefs[i], sym);
    }
    return [mdString, latexDefs.slice(this.formula.length)];
  }

  symList() {
    return this.formula;
  }

  private getTagDisplay() {
    if (!this.tag) return '';
    const color = this.isAssrt ? '\\color{#555}' : '\\color{#999}';
    return '$\\scriptsize ' + color + this.tag + '$ ';
  }
  static getLookupTermsForExpression(
    expression: string[],
    lookupTerms: ResourcePointer[],
    alreadyConsumed: number
  ): any[] {
    if (alreadyConsumed >= lookupTerms.length) return [alreadyConsumed, []];
    const needed = expression.filter(
      (sym) => MetamathStmt.NON_TERM_CHARS.indexOf(sym) == -1
    ).length;
    const end = Math.min(alreadyConsumed + needed, lookupTerms.length);
    return [end, lookupTerms.slice(alreadyConsumed, end)];
  }
  isEmpty() {
    return (
      !this.tag &&
      this.formula.length == 0 &&
      this.lookupTerms.length == 0 &&
      !this.isAssrt
    );
  }
}

export class MetamathDistinctVariables implements MetamathObject {
  static EMPTY_VARS() {
    return new MetamathDistinctVariables([], []);
  }
  constructor(
    public distinctGroups: string[][] = [],
    public lookupTerms: ResourcePointer[] = []
  ) {}

  toMarkdown(latexDefs: string[]): [string, string[]] {
    const groupStrings = [];
    let cumulativeIndex = 0;
    for (const group of this.distinctGroups) {
      let groupSyms = [];
      for (let i = 0; i < group.length; i++) {
        const sym = group[i];
        let term: ResourcePointer = null;
        const index = cumulativeIndex + i;
        if (index < this.lookupTerms.length) {
          term = this.lookupTerms[index];
        }
        groupSyms.push(getDisplayPhrase(term, latexDefs[index], sym));
      }
      groupStrings.push(groupSyms.join(', '));
      cumulativeIndex += group.length;
    }
    return [
      groupStrings.join(' &nbsp;&nbsp;'),
      latexDefs.slice(cumulativeIndex),
    ];
  }

  symList() {
    return [].concat(...this.distinctGroups);
  }
}

export class MetamathProposition implements MetamathObject {
  constructor(
    public hypotheses: MetamathStmt[] = [],
    public assrt: MetamathStmt = MetamathStmt.EMPTY_STMT(),
    public distinctVars: MetamathDistinctVariables = MetamathDistinctVariables.EMPTY_VARS()
  ) {}

  toMarkdown(latexDefs: string[]): [string, string[]] {
    const hypMd = [];
    let markdownString;
    for (const hyp of this.hypotheses) {
      [markdownString, latexDefs] = hyp.toMarkdown(latexDefs);
      hypMd.push(markdownString);
    }
    [markdownString, latexDefs] = this.assrt.toMarkdown(latexDefs);
    const assrtMd = markdownString;

    [markdownString, latexDefs] = this.distinctVars.toMarkdown(latexDefs);
    const distinctVarOutput = markdownString;
    latexDefs = distinctVarOutput.remainingLatexDefs;
    return [this.prettyPrint(hypMd, assrtMd, distinctVarOutput), latexDefs];
  }

  symList() {
    const hypSyms = [].concat(...this.hypotheses.map((h) => h.formula));
    return [...hypSyms, ...this.assrt.formula, ...this.distinctVars.symList()];
  }

  private prettyPrint(
    hypMd: string[],
    assrtMd: string,
    distinctVarsMd: string
  ) {
    let content = '';
    if (hypMd.length == 0) {
      content = assrtMd;
    } else if (hypMd.length == 1) {
      content = '*If* ' + hypMd[0] + ' \n\n*then,* ' + assrtMd;
    } else {
      content = '*Given the following hypothesis:*\\\n';
      for (let i = 0; i < hypMd.length; i++) {
        content += hypMd[i] + (i == hypMd.length - 1 ? '\n' : '\\\n');
      }
      content += '\n\n*we can assert that:*\\\n' + assrtMd;
    }
    if (distinctVarsMd) {
      const DISTINCT_VAR_REF = "#(metamath/T_distinct_variable, 'distinct')";
      content += this.hypotheses.length === 0 ? ' ' : '\n\n';
      if (this.distinctVars.distinctGroups.length === 1) {
        content +=
          '*when* ' + distinctVarsMd + ' *are ' + DISTINCT_VAR_REF + '*';
      } else {
        content +=
          '*when the following groups of variables are ' +
          DISTINCT_VAR_REF +
          ':* ';
        content += distinctVarsMd;
      }
    }
    return content;
  }
}

export class ProofStep implements MetamathObject {
  constructor(
    public index: number,
    public hypUsedIndexList: number[],
    public hypRef: string,
    public propRef: PropositionPointer,
    public expression: string[],
    public lookupTerms: ResourcePointer[]
  ) {}

  toMarkdown(latexDefs: string[]): [string, string[]] {
    let ref = '';
    if (this.hypRef) {
      ref = this.hypRef;
    } else if (this.propRef) {
      // Escape the '\' so that it doesn't get mixed with the table dividers.
      ref =
        '#(' +
        this.propRef.toString() +
        ", '" +
        this.propRef.ptr.id +
        "'\\|HIDE_TVI)";
    }

    let markdownString;
    [markdownString, latexDefs] = new MetamathStmt(
      '',
      this.expression,
      this.lookupTerms
    ).toMarkdown(latexDefs);
    const mdString = ('| ' +
      (this.index + 1) +
      ' | ' +
      this.hypUsedIndexList.map((x) => x + 1).join(', ') +
      ' | ' +
      ref +
      ' | ' +
      markdownString) as string;
    return [mdString, latexDefs];
  }

  expressionToMarkdown(latexDefs: string[]): string {
    return new MetamathStmt('', this.expression, this.lookupTerms).toMarkdown(
      latexDefs
    )[0];
  }

  symList() {
    return this.expression;
  }
}

export class MetamathArgument implements MetamathObject {
  static readonly EMPTY_ARGUMENT = new MetamathArgument([], [], []);
  static readonly ARGUMENT_TABLE_HEADER =
    '\n| Step | Hyp | Ref | Expression |\n|---|---|---|---|\n';

  constructor(
    public dummyVars: string[],
    public dummyVarsLookupTerms,
    public proofSteps: ProofStep[],
    public additionalArgText = ''
  ) {}

  toMarkdown(latexDefs: string[]): [string, string[]] {
    let markdownString;
    [markdownString, latexDefs] = this.dummyVarsToMarkdown(
      this.dummyVars,
      latexDefs
    );
    const dummyVarsOutput = markdownString;

    const stepMds: string[] = [];
    for (const step of this.proofSteps) {
      [markdownString, latexDefs] = step.toMarkdown(latexDefs);
      stepMds.push(markdownString as string);
    }
    let mdString = MetamathArgument.ARGUMENT_TABLE_HEADER + stepMds.join('\n');
    if (dummyVarsOutput.markdown)
      mdString = dummyVarsOutput.markdown + '\n' + mdString;
    if (this.additionalArgText) mdString += '\n\n' + this.additionalArgText;
    return [mdString, latexDefs];
  }

  symList() {
    const proofStepSyms = [].concat(
      ...this.proofSteps.map((step) => step.symList())
    );
    return [...this.dummyVars, ...proofStepSyms];
  }

  private dummyVarsToMarkdown(
    dummyVars: string[],
    latexDefs: string[]
  ): [string, string[]] {
    if (!dummyVars || !dummyVars.length) return ['', latexDefs];
    const varToMdString = [];
    for (let i = 0; i < dummyVars.length; i++) {
      const dummyVar = dummyVars[i];
      let term: ResourcePointer = null;
      if (i < this.dummyVarsLookupTerms.length) {
        term = this.dummyVarsLookupTerms[i];
      }
      varToMdString.push(getDisplayPhrase(term, latexDefs[i], dummyVar));
    }

    const mdString =
      'Dummy variables ' +
      varToMdString.join(' ') +
      ' are mutually distinct and distinct from all other variables.';
    return [mdString, latexDefs.slice(dummyVars.length)];
  }
}

function getDisplayPhrase(
  term: ResourcePointer,
  displayPhrase: string,
  original: string
) {
  if (!displayPhrase) return '~~' + original + '~~ ';
  const latexed = '$' + displayPhrase + '$';
  if (!term) return latexed + ' ';
  return '#(' + term.toString() + ", '" + latexed + "') ";
}
