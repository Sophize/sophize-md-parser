import { MarkdownParser } from "../src";
import * as u from './test-utils';

describe("TexmathPlugin", () => {
  let parser = new MarkdownParser();

  it("not TeX math - opening brace followed by space", () => {
    const ast = parser.parse("$ E = mc^2$");
    const expected = u.paragraphNode([u.inlineNode([u.textNode("$ E = mc^2$")])]);
    expect(u.astArrayMatches([expected], ast, [])).toBe("");
  });

  it("not TeX math - closing brace after space", () => {
    const ast = parser.parse("$E = mc^2 $");
    const expected = u.paragraphNode([u.inlineNode([u.textNode("$E = mc^2 $")])]);
    expect(u.astArrayMatches([expected], ast, [])).toBe("");
  });

  it("not TeX math - digit after dollar", () => {
    const ast = parser.parse("Give me 10$and$20 notes");
    const expected = u.paragraphNode([
      u.inlineNode([u.textNode("Give me 10$and$20 notes")]),
    ]);
    expect(u.astArrayMatches([expected], ast, [])).toBe("");
  });

  it("math_inline", () => {
    const ast = parser.parse("$E = mc^2$");
    const latexNode = u.mathInlineNode("E = mc^2");
    const expected = u.paragraphNode([u.inlineNode([latexNode])]);
    expect(u.astArrayMatches([expected], ast, [])).toBe("");
  });

  it("math_inline single character", () => {
    const ast = parser.parse("$E$");
    const latexNode = u.mathInlineNode("E");
    const expected = u.paragraphNode([u.inlineNode([latexNode])]);
    expect(u.astArrayMatches([expected], ast, [])).toBe("");
  });

  it("math_block single character", () => {
    const ast = parser.parse("$$E$$");
    const latexNode = u.mathBlockNode("E");
    const expected = u.paragraphNode([u.inlineNode([latexNode])]);
    expect(u.astArrayMatches([expected], ast, [])).toBe("");
  });

  it("math_block", () => {
    const ast = parser.parse("$$E = mc^2$$");
    const latexNode = u.simpleNode("math_block", [], "E = mc^2");
    const expected = u.paragraphNode([u.inlineNode([latexNode])]);
    expect(u.astArrayMatches([expected], ast, [])).toBe("");
  });

  it("math_inline with text", () => {
    const ast = parser.parse("AE said $E = mc^2$.");
    const finalNodes = [
      u.textNode("AE said "),
      u.mathInlineNode("E = mc^2"),
      u.textNode("."),
    ];
    const expected = u.paragraphNode([u.inlineNode(finalNodes)]);
    expect(u.astArrayMatches([expected], ast, [])).toBe("");
  });

  it("math_block with text", () => {
    const ast = parser.parse("AE said $$E = mc^2$$.");
    const finalNodes = [
      u.textNode("AE said "),
      u.mathBlockNode("E = mc^2"),
      u.textNode("."),
    ];
    const expected = u.paragraphNode([u.inlineNode(finalNodes)]);
    expect(u.astArrayMatches([expected], ast, [])).toBe("");
  });

  it("math_inline multi line", () => {
    const ast = parser.parse("AE said $E = \nmc^2$.");
    const finalNodes = [
      u.textNode("AE said "),
      u.mathInlineNode("E = \nmc^2"),
      u.textNode("."),
    ];
    const expected = u.paragraphNode([u.inlineNode(finalNodes)]);
    expect(u.astArrayMatches([expected], ast, [])).toBe("");
  });

  it("math_inline multi line with single backslash", () => {
    const ast = parser.parse("AE said $E = \\\nmc^2$.");
    const finalNodes = [
      u.textNode("AE said "),
      u.mathInlineNode("E = \nmc^2"),
      u.textNode("."),
    ];
    const expected = u.paragraphNode([u.inlineNode(finalNodes)]);
    expect(u.astArrayMatches([expected], ast, [])).toBe("");
  });

  it("math_inline multi line with double backslash", () => {
    const ast = parser.parse("AE said $E = \\\\\nmc^2$.");
    const finalNodes = [
      u.textNode("AE said "),
      u.mathInlineNode("E = \\\\\nmc^2"),
      u.textNode("."),
    ];
    const expected = u.paragraphNode([u.inlineNode(finalNodes)]);
    expect(u.astArrayMatches([expected], ast, [])).toBe("");
  });

  it("math_block_eqno", () => {
    const ast = parser.parse("$$E = mc^2$$ (1.2)");
    const latexNode = u.mathBlockEqNoNode("E = mc^2", "1.2");
    const expected = u.paragraphNode([u.inlineNode([latexNode])]);
    expect(u.astArrayMatches([expected], ast, [])).toBe("");
  });

  it("math_block with only ending text", () => {
    const ast = parser.parse("$$E = mc^2$$, said AE.");
    const finalNodes = [u.mathBlockNode("E = mc^2"), u.textNode(", said AE.")];
    const expected = u.paragraphNode([u.inlineNode(finalNodes)]);
    expect(u.astArrayMatches([expected], ast, [])).toBe("");
  });

  it("multiple mathInline", () => {
    const ast = parser.parse("$\\in$ a $\\in$");
    const finalNodes = [
      u.mathInlineNode("\\in"),
      u.textNode(" a "),
      u.mathInlineNode("\\in"),
    ];
    const expected = u.paragraphNode([u.inlineNode(finalNodes)]);
    expect(u.astArrayMatches([expected], ast, [])).toBe("");
  });


  it("inline and block mixed", () => {
    const ast = parser.parse("$$\\in$$ $\\in$ $$m$$");
    const finalNodes = [
      u.mathBlockNode("\\in"),
      u.textNode(" "),
      u.mathInlineNode("\\in"),
      u.textNode(" "),
      u.mathBlockNode("m"),
    ];
    const expected = u.paragraphNode([u.inlineNode(finalNodes)]);
    expect(u.astArrayMatches([expected], ast, [])).toBe("");
  });

  /*
    More Issues to be fixed:
    it("number right after $", () => {
      const ast = parser.parse("$\\sharp$1062");
      const finalNodes = [
        u.mathInlineNode("\\in"),
        u.textNode(" a "),
        u.mathInlineNode("\\in"),
      ];
      const expected = u.paragraphNode([u.inlineNode(finalNodes)]);
      expect(u.astArrayMatches([expected], ast, [])).toBe("");
    });

    it('dollars in mathInline \\text', () => {
        const ast = parser.parse('pre $E = \\text{$M$}$');
        const finalNodes = [u.textNode('pre '), u.mathInlineNode('E = \\text{$M$}')];
        const expected = u.paragraphNode([u.inlineNode(finalNodes)]);
        expect(u.astArrayMatches([expected], ast, [])).toBe('');
    });

    it('dollars in mathBlock', () => {
        const ast = parser.parse('pre $$E = $M$$$');
        const finalNodes = [u.textNode('pre '), u.mathBlockNode('E = $M$')];
        const expected = u.paragraphNode([u.inlineNode(finalNodes)]);
        expect(u.astArrayMatches([expected], ast, [])).toBe('');
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
});
