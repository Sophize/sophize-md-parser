import MarkdownIt from "markdown-it";
import { Observable, of } from "rxjs";
import { map, switchMap } from "rxjs/operators";
import { Language, Resource } from "sophize-datamodel";
import {
  expandAst,
  getResourcesToExpand,
  ILatexDefsFetcher,
  IResourceFetcher,
} from "./ast-expander";
import { MdContext } from "./link-helpers";
import { LinkPlugin } from "./link-plugin";
import tokensToAST, { AstNode } from "./md-utils";
import { metamathToMarkdown } from "./metamath/metamath-parser";
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
      .use(LinkPlugin);
  }

  parseSimple = (
    mdString: string,
    getLatexDefs?: ILatexDefsFetcher,
    mdContext?: MdContext
  ): Observable<AstNode[]> => {
    if (!mdString) return of([]);
    let md$ = of(mdString);
    if (mdContext?.language === Language.MetamathSetMm) {
      md$ = metamathToMarkdown(mdString, mdContext.lookupTerms, getLatexDefs);
    }
    return md$.pipe(
      map((str) => {
        const corrected =
          (mdContext?.addNegationMarker ? " _It is false that_: " : "") + str;
        const tokens = mdContext?.inline
          ? this.md.parseInline(corrected, mdContext)
          : this.md.parse(corrected, mdContext);
        return tokensToAST(tokens);
      })
    );
  };

  parseExpanded(
    mdString: string,
    getResources: IResourceFetcher,
    getLatexDefs?: ILatexDefsFetcher,
    mdContext?: MdContext
  ): Observable<AstNode[]> {
    const ast = this.parseSimple(mdString, getLatexDefs, mdContext);
    if (!getResources) return ast;
    const resourceMap = new Map<string, Resource>();

    return ast.pipe(
      switchMap((ast: AstNode[]) => {
        const toExpand = new Set<string>();
        getResourcesToExpand(ast, toExpand);
        if (!toExpand.size) return of(ast);
        const expandedAst$ = new Observable<AstNode[]>((subscriber) => {
          subscriber.next(ast);
          expandAst(
            0,
            subscriber,
            ast,
            toExpand,
            resourceMap,
            this,
            getResources,
            getLatexDefs
          );
        });
        return expandedAst$;
      })
    );
  }
}
