import MarkdownIt from "markdown-it";
import { ResourcePointer } from "sophize-datamodel";
import { MdContext } from "./link-helpers";
import { LinkMarkdownPlugin } from "./link-markdown-plugin";
import tokensToAST from "./md-utils";
import { CaseOption } from "./resource-display-options";
import { TexmathPlugin } from "./texmath-plugin";

export class MarkdownParser {
  private md: any;
  constructor() {
    this.md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
    })
      .use(TexmathPlugin)
      .use(LinkMarkdownPlugin);
  }

  parse(
    mdString: string,
    contextPtr: ResourcePointer,
    plainText: boolean,
    caseOption: CaseOption
  ) {
    if (!mdString) mdString = "";
    return tokensToAST(
      this.md.parse(mdString, new MdContext(contextPtr, plainText, caseOption))
    );
  }

  parseInline(
    mdString: string,
    contextPtr: ResourcePointer,
    plainText: boolean,
    caseOption: CaseOption
  ) {
    if (!mdString) mdString = "";
    return tokensToAST(
      this.md.parseInline(
        mdString,
        new MdContext(contextPtr, plainText, caseOption)
      )
    );
  }
}
