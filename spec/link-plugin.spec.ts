import { LinkContent, MarkdownParser } from "../src";
import * as u from "./test-utils";

describe("LinkPlugin", () => {
  let parser = new MarkdownParser();

  it("simple link", () => {
    const ast = parser.parse("#wiki/T_term");
    const linkNode = u.linkNode(
      new LinkContent("wiki/T_term", null, "#wiki/T_term", u.EMPTY_CONTEXT, true)
    );
    const expected = u.paragraphNode([u.inlineNode([linkNode])]);
    expect(u.astArrayMatches([expected], ast, [])).toBe("");
  });
});
