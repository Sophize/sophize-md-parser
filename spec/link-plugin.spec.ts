import fetch from "node-fetch";
import { from, lastValueFrom, Observable, of } from "rxjs";
import { Resource, ResourcePointer } from "sophize-datamodel";
import { MarkdownParser } from "../src";
import { createLinkContent } from "../src/link-plugin";
import { AstNode } from "../src/md-utils";
import * as u from "./test-utils";

describe("LinkPlugin", () => {
  let parser = new MarkdownParser();

  it("simple link", async () => {
    const ast = await getSimpleAst("#wiki/T_term");
    const linkNode = u.linkNode(
      createLinkContent("#wiki/T_term", "wiki/T_term", null, true)
    );
    const expected = u.paragraphNode([u.inlineNode([linkNode])]);
    expect(u.astArrayMatches([expected], ast, [])).toBe("");
  });

  it("simple link with display input", async () => {
    const ast = await getSimpleAst("#wiki/T_term|NO_LINK");
    const linkNode = u.linkNode(
      createLinkContent("#wiki/T_term|NO_LINK", "wiki/T_term", "NO_LINK", true)
    );
    const expected = u.paragraphNode([u.inlineNode([linkNode])]);
    expect(u.astArrayMatches([expected], ast, [])).toBe("");
  });

  it("simple link with brackets", async () => {
    const ast = await getSimpleAst("#(wiki/T_term)");
    const linkNode = u.linkNode(
      createLinkContent("#(wiki/T_term)", "wiki/T_term", null, true)
    );
    const expected = u.paragraphNode([u.inlineNode([linkNode])]);
    expect(u.astArrayMatches([expected], ast, [])).toBe("");
  });

  it("two part link", async () => {
    const ast = await getSimpleAst("#(wiki/T_term, NAV_LINK)");
    const linkNode = u.linkNode(
      createLinkContent(
        "#(wiki/T_term, NAV_LINK)",
        "wiki/T_term",
        "NAV_LINK",
        true
      )
    );
    const expected = u.paragraphNode([u.inlineNode([linkNode])]);
    expect(u.astArrayMatches([expected], ast, [])).toBe("");
  });

  it("two part link with quotes", async () => {
    const ast = await getSimpleAst("#(wiki/T_term, 'A term')");
    const linkNode = u.linkNode(
      createLinkContent(
        "#(wiki/T_term, 'A term')",
        "wiki/T_term",
        "'A term'",
        true
      )
    );
    const expected = u.paragraphNode([u.inlineNode([linkNode])]);
    expect(u.astArrayMatches([expected], ast, [])).toBe("");
  });

  async function getSimpleAst(mdString: string) {
    return await lastValueFrom(parser.parseSimple(mdString));
  }
});
