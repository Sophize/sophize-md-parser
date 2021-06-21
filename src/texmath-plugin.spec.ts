import MarkdownIt from "markdown-it";
import { LinkMarkdownPlugin } from "./link-markdown-plugin";
import tokensToAST from "./md-utils";
import { TexmathPlugin } from "./texmath-plugin";

describe("TexmathPlugin", () => {
  let md = MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
  })
    .use(TexmathPlugin)
    .use(LinkMarkdownPlugin);

  it("not TeX math - opening brace followed by space", () => {
    const ast = tokensToAST(md.parse("$ E = mc^2$"));
    const expected = paragraphNode([inlineNode([textNode("$ E = mc^2$")])]);
    expect(astArrayMatches([expected], ast, [])).toBe("");
  });

  it("not TeX math - closing brace after space", () => {
    const ast = tokensToAST(md.parse("$E = mc^2 $"));
    const expected = paragraphNode([inlineNode([textNode("$E = mc^2 $")])]);
    expect(astArrayMatches([expected], ast, [])).toBe("");
  });

  it("not TeX math - digit after dollar", () => {
    const ast = tokensToAST(md.parse("Give me 10$and$20 notes"));
    const expected = paragraphNode([
      inlineNode([textNode("Give me 10$and$20 notes")]),
    ]);
    expect(astArrayMatches([expected], ast, [])).toBe("");
  });

  it("math_inline", () => {
    const ast = tokensToAST(md.parse("$E = mc^2$"));
    const latexNode = mathInlineNode("E = mc^2");
    const expected = paragraphNode([inlineNode([latexNode])]);
    expect(astArrayMatches([expected], ast, [])).toBe("");
  });

  it("math_inline single character", () => {
    const ast = tokensToAST(md.parse("$E$"));
    const latexNode = mathInlineNode("E");
    const expected = paragraphNode([inlineNode([latexNode])]);
    expect(astArrayMatches([expected], ast, [])).toBe("");
  });

  it("math_block single character", () => {
    const ast = tokensToAST(md.parse("$$E$$"));
    const latexNode = mathBlockNode("E");
    const expected = paragraphNode([inlineNode([latexNode])]);
    expect(astArrayMatches([expected], ast, [])).toBe("");
  });

  it("math_block", () => {
    const ast = tokensToAST(md.parse("$$E = mc^2$$"));
    const latexNode = simpleNode("math_block", [], "E = mc^2");
    const expected = paragraphNode([inlineNode([latexNode])]);
    expect(astArrayMatches([expected], ast, [])).toBe("");
  });

  it("math_inline with text", () => {
    const ast = tokensToAST(md.parse("AE said $E = mc^2$."));
    const finalNodes = [
      textNode("AE said "),
      mathInlineNode("E = mc^2"),
      textNode("."),
    ];
    const expected = paragraphNode([inlineNode(finalNodes)]);
    expect(astArrayMatches([expected], ast, [])).toBe("");
  });

  it("math_block with text", () => {
    const ast = tokensToAST(md.parse("AE said $$E = mc^2$$."));
    const finalNodes = [
      textNode("AE said "),
      mathBlockNode("E = mc^2"),
      textNode("."),
    ];
    const expected = paragraphNode([inlineNode(finalNodes)]);
    expect(astArrayMatches([expected], ast, [])).toBe("");
  });

  it("math_inline multi line", () => {
    const ast = tokensToAST(md.parse("AE said $E = \nmc^2$."));
    const finalNodes = [
      textNode("AE said "),
      mathInlineNode("E = \nmc^2"),
      textNode("."),
    ];
    const expected = paragraphNode([inlineNode(finalNodes)]);
    expect(astArrayMatches([expected], ast, [])).toBe("");
  });

  it("math_inline multi line with single backslash", () => {
    const ast = tokensToAST(md.parse("AE said $E = \\\nmc^2$."));
    const finalNodes = [
      textNode("AE said "),
      mathInlineNode("E = \nmc^2"),
      textNode("."),
    ];
    const expected = paragraphNode([inlineNode(finalNodes)]);
    expect(astArrayMatches([expected], ast, [])).toBe("");
  });

  it("math_inline multi line with double backslash", () => {
    const ast = tokensToAST(md.parse("AE said $E = \\\\\nmc^2$."));
    const finalNodes = [
      textNode("AE said "),
      mathInlineNode("E = \\\\\nmc^2"),
      textNode("."),
    ];
    const expected = paragraphNode([inlineNode(finalNodes)]);
    expect(astArrayMatches([expected], ast, [])).toBe("");
  });

  it("math_block_eqno", () => {
    const ast = tokensToAST(md.parse("$$E = mc^2$$ (1.2)"));
    const latexNode = mathBlockEqNoNode("E = mc^2", "1.2");
    const expected = paragraphNode([inlineNode([latexNode])]);
    expect(astArrayMatches([expected], ast, [])).toBe("");
  });

  it("math_block with only ending text", () => {
    const ast = tokensToAST(md.parse("$$E = mc^2$$, said AE."));
    const finalNodes = [mathBlockNode("E = mc^2"), textNode(", said AE.")];
    const expected = paragraphNode([inlineNode(finalNodes)]);
    expect(astArrayMatches([expected], ast, [])).toBe("");
  });

  it("multiple mathInline", () => {
    const ast = tokensToAST(md.parse("$\\in$ a $\\in$"));
    const finalNodes = [
      mathInlineNode("\\in"),
      textNode(" a "),
      mathInlineNode("\\in"),
    ];
    const expected = paragraphNode([inlineNode(finalNodes)]);
    expect(astArrayMatches([expected], ast, [])).toBe("");
  });


  it("inline and block mixed", () => {
    const ast = tokensToAST(md.parse("$$\\in$$ $\\in$ $$m$$"));
    const finalNodes = [
      mathBlockNode("\\in"),
      textNode(" "),
      mathInlineNode("\\in"),
      textNode(" "),
      mathBlockNode("m"),
    ];
    const expected = paragraphNode([inlineNode(finalNodes)]);
    expect(astArrayMatches([expected], ast, [])).toBe("");
  });

  /*
    More Issues to be fixed:
    it("number right after $", () => {
      const ast = tokensToAST(md.parse("$\\sharp$1062"));
      const finalNodes = [
        mathInlineNode("\\in"),
        textNode(" a "),
        mathInlineNode("\\in"),
      ];
      const expected = paragraphNode([inlineNode(finalNodes)]);
      expect(astArrayMatches([expected], ast, [])).toBe("");
    });

    it('dollars in mathInline \\text', () => {
        const ast = tokensToAST(md.parse('pre $E = \\text{$M$}$'));
        const finalNodes = [textNode('pre '), mathInlineNode('E = \\text{$M$}')];
        const expected = paragraphNode([inlineNode(finalNodes)]);
        expect(astArrayMatches([expected], ast, [])).toBe('');
    });

    it('dollars in mathBlock', () => {
        const ast = tokensToAST(md.parse('pre $$E = $M$$$'));
        const finalNodes = [textNode('pre '), mathBlockNode('E = $M$')];
        const expected = paragraphNode([inlineNode(finalNodes)]);
        expect(astArrayMatches([expected], ast, [])).toBe('');
    });
    {
        "": [  
            "IntegrationOfDifferentialBinomial", // 5$-$8 $x$.   https://github.com/jgm/pandoc/issues/7058
            "ProofOfArithmeticgeometricMeansInequalityUsingLagrangeMultipliers", // $M \text{  $i<space needed>$, }$
            "EverySymplecticManifoldHasEvenDimension", // $\text{ $v \in V<space needed>$}$
            "ReductionOfEllipticIntegralsToStandardForm", // a $$E[newline]=[newline]m$$
            "ExistenceOfSquareRootsOfNonnegativeRealNumbers",  // a $$E[newline]>[newline]m$$
            "AcceptancerejectionMethod", // a $$E[newline]=[newline]m$$
            "ProofOfPseudoparadoxInMeasureTheory", // If $E[newline]+ m$
            "OuterMultiplication", // equals becoming heading problem
            "IntegralBinaryQuadraticForms", // equals becoming heading problem + latex in table
            "ellpXSpace", //  KaTeX parse error: $ within math mode
            "IncidenceMatrixWithRespectToAnOrientation",
            "BrunsPureSieve", // Double newline in math block 
            "GeneralizedVanKampenSiefertTheoremForDoubleGroupoids1", // unused hdgb labto
            "A22StructuralRules", // unused xspace inferrule @endlamuarg
            "Quant1TemplateTest" //unused
        ],
        "environment": [
            "CWcomplexApproximationOfQuantumStateSpacesInQAT", // CD, supported in MathJax
            "LongExactSequencelocallyTrivialBundle", // CD, supported in MathJax
            "ComplexArithmeticgeometricMean", // xy, not suupported in MathJax either,
            "Comodule" // xy, not suupported in MathJax either,
        ]
    }
    */

  function astMatches(expected, actual, index: number[]): string {
    for (const key in expected) {
      if (key === "children") continue;
      if (expected[key] !== actual[key]) {
        const err = `[${key}] mismatch - expected [${expected[key]}], actual [${actual[key]}]`;
        return addIndex(index, err);
      }
    }
    return astArrayMatches(expected["children"], actual["children"], index);
  }

  function astArrayMatches(expected: any[], actual: any[], index: number[]) {
    const expectedLen = safeLen(expected);
    const actualLen = safeLen(actual);
    if (expectedLen !== actualLen) {
      const err = `children length mismatch expected: ${expectedLen}, actual: ${actualLen}`;
      return addIndex(index, err);
    }
    if (expectedLen === 0) return "";

    for (let i = 0; i < expectedLen; i++) {
      const v = astMatches(expected[i], actual[i], [...index, i]);
      if (v) return v;
    }
    return "";
  }

  function safeLen(arr: any[]) {
    return arr ? arr.length : 0;
  }

  function addIndex(index: number[], logMessage: string) {
    return "[" + index.join(", ") + "]: " + logMessage;
  }

  function simpleNode(type: string, children?: any[], content?: string) {
    const node = { type: type, children: children ? children : [] };
    if (content) node["content"] = content;
    return node;
  }

  function paragraphNode(children?: any[], content?: string) {
    return simpleNode("paragraph", children, content);
  }

  function textNode(content: string) {
    return simpleNode("text", [], content);
  }

  function inlineNode(children?: any[], content?: string) {
    return simpleNode("inline", children, content);
  }

  function mathInlineNode(content: string) {
    return simpleNode("math_inline", [], content);
  }

  function mathBlockNode(content: string) {
    return simpleNode("math_block", [], content);
  }

  function mathBlockEqNoNode(content: string, eqNo: string) {
    const node = simpleNode("math_block_eqno", [], content);
    node["sourceInfo"] = eqNo;
    return node;
  }
});
