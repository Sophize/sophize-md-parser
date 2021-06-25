import { lastValueFrom } from "rxjs";
import { MarkdownParser } from "../src";
import * as u from "./test-utils";

describe("TexmathPlugin", () => {
  let parser = new MarkdownParser();

  it("not TeX math - opening brace followed by space", async () => {
    const ast = await getSimpleAst("$ E = mc^2$");
    const expected = u.paragraphNode([
      u.inlineNode([u.textNode("$ E = mc^2$")]),
    ]);
    expect(u.astArrayMatches([expected], ast, [])).toBe("");
  });

  it("not TeX math - closing brace after space", async () => {
    const ast = await getSimpleAst("$E = mc^2 $");
    const expected = u.paragraphNode([
      u.inlineNode([u.textNode("$E = mc^2 $")]),
    ]);
    expect(u.astArrayMatches([expected], ast, [])).toBe("");
  });

  it("not TeX math - digit after dollar", async () => {
    const ast = await getSimpleAst("Give me 10$and$20 notes");
    const expected = u.paragraphNode([
      u.inlineNode([u.textNode("Give me 10$and$20 notes")]),
    ]);
    expect(u.astArrayMatches([expected], ast, [])).toBe("");
  });

  it("math_inline", async () => {
    const ast = await getSimpleAst("$E = mc^2$");
    const latexNode = u.mathInlineNode("E = mc^2");
    const expected = u.paragraphNode([u.inlineNode([latexNode])]);
    expect(u.astArrayMatches([expected], ast, [])).toBe("");
  });

  it("math_inline single character", async () => {
    const ast = await getSimpleAst("$E$");
    const latexNode = u.mathInlineNode("E");
    const expected = u.paragraphNode([u.inlineNode([latexNode])]);
    expect(u.astArrayMatches([expected], ast, [])).toBe("");
  });

  it("math_block single character", async () => {
    const ast = await getSimpleAst("$$E$$");
    const latexNode = u.mathBlockNode("E");
    const expected = u.paragraphNode([u.inlineNode([latexNode])]);
    expect(u.astArrayMatches([expected], ast, [])).toBe("");
  });

  it("math_block", async () => {
    const ast = await getSimpleAst("$$E = mc^2$$");
    const latexNode = u.simpleNode("math_block", [], "E = mc^2");
    const expected = u.paragraphNode([u.inlineNode([latexNode])]);
    expect(u.astArrayMatches([expected], ast, [])).toBe("");
  });

  it("math_inline with text", async () => {
    const ast = await getSimpleAst("AE said $E = mc^2$.");
    const finalNodes = [
      u.textNode("AE said "),
      u.mathInlineNode("E = mc^2"),
      u.textNode("."),
    ];
    const expected = u.paragraphNode([u.inlineNode(finalNodes)]);
    expect(u.astArrayMatches([expected], ast, [])).toBe("");
  });

  it("math_block with text", async () => {
    const ast = await getSimpleAst("AE said $$E = mc^2$$.");
    const finalNodes = [
      u.textNode("AE said "),
      u.mathBlockNode("E = mc^2"),
      u.textNode("."),
    ];
    const expected = u.paragraphNode([u.inlineNode(finalNodes)]);
    expect(u.astArrayMatches([expected], ast, [])).toBe("");
  });

  it("math_inline multi line", async () => {
    const ast = await getSimpleAst("AE said $E = \nmc^2$.");
    const finalNodes = [
      u.textNode("AE said "),
      u.mathInlineNode("E = \nmc^2"),
      u.textNode("."),
    ];
    const expected = u.paragraphNode([u.inlineNode(finalNodes)]);
    expect(u.astArrayMatches([expected], ast, [])).toBe("");
  });

  it("math_inline multi line with single backslash", async () => {
    const ast = await getSimpleAst("AE said $E = \\\nmc^2$.");
    const finalNodes = [
      u.textNode("AE said "),
      u.mathInlineNode("E = \nmc^2"),
      u.textNode("."),
    ];
    const expected = u.paragraphNode([u.inlineNode(finalNodes)]);
    expect(u.astArrayMatches([expected], ast, [])).toBe("");
  });

  it("math_inline multi line with double backslash", async () => {
    const ast = await getSimpleAst("AE said $E = \\\\\nmc^2$.");
    const finalNodes = [
      u.textNode("AE said "),
      u.mathInlineNode("E = \\\\\nmc^2"),
      u.textNode("."),
    ];
    const expected = u.paragraphNode([u.inlineNode(finalNodes)]);
    expect(u.astArrayMatches([expected], ast, [])).toBe("");
  });

  it("math_block_eqno", async () => {
    const ast = await getSimpleAst("$$E = mc^2$$ (1.2)");
    const latexNode = u.mathBlockEqNoNode("E = mc^2", "1.2");
    const expected = u.paragraphNode([u.inlineNode([latexNode])]);
    expect(u.astArrayMatches([expected], ast, [])).toBe("");
  });

  it("math_block with only ending text", async () => {
    const ast = await getSimpleAst("$$E = mc^2$$, said AE.");
    const finalNodes = [u.mathBlockNode("E = mc^2"), u.textNode(", said AE.")];
    const expected = u.paragraphNode([u.inlineNode(finalNodes)]);
    expect(u.astArrayMatches([expected], ast, [])).toBe("");
  });

  it("multiple mathInline", async () => {
    const ast = await getSimpleAst("$\\in$ a $\\in$");
    const finalNodes = [
      u.mathInlineNode("\\in"),
      u.textNode(" a "),
      u.mathInlineNode("\\in"),
    ];
    const expected = u.paragraphNode([u.inlineNode(finalNodes)]);
    expect(u.astArrayMatches([expected], ast, [])).toBe("");
  });

  it("inline and block mixed", async () => {
    const ast = await getSimpleAst("$$\\in$$ $\\in$ $$m$$");
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
    it("number right after $", async () => {
      const ast = await getSimpleAst("$\\sharp$1062");
      const finalNodes = [
        u.mathInlineNode("\\in"),
        u.textNode(" a "),
        u.mathInlineNode("\\in"),
      ];
      const expected = u.paragraphNode([u.inlineNode(finalNodes)]);
      expect(u.astArrayMatches([expected], ast, [])).toBe("");
    });

    it('dollars in mathInline \\text', () => {
        const ast = await getSimpleAst('pre $E = \\text{$M$}$');
        const finalNodes = [u.textNode('pre '), u.mathInlineNode('E = \\text{$M$}')];
        const expected = u.paragraphNode([u.inlineNode(finalNodes)]);
        expect(u.astArrayMatches([expected], ast, [])).toBe('');
    });

    it('dollars in mathBlock', () => {
        const ast = await getSimpleAst('pre $$E = $M$$$');
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

  async function getSimpleAst(mdString: string) {
    return await lastValueFrom(parser.parseSimple(mdString));
  }
});
