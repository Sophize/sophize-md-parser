import { LinkContent } from "../src";
import { AstNode } from "../src/md-utils";

export function simpleNode(
  type: string,
  children?: any[],
  content?: string | LinkContent
) {
  const node = { type: type, children: children ? children : [] };
  if (content) node["content"] = content;
  return node;
}

export function paragraphNode(children?: any[], content?: string) {
  return simpleNode("paragraph", children, content);
}

export function textNode(content: string) {
  return simpleNode("text", [], content);
}

export function inlineNode(children?: any[], content?: string) {
  return simpleNode("inline", children, content);
}

export function mathInlineNode(content: string) {
  return simpleNode("math_inline", [], content);
}

export function mathBlockNode(content: string) {
  return simpleNode("math_block", [], content);
}

export function mathBlockEqNoNode(content: string, eqNo: string) {
  const node = simpleNode("math_block_eqno", [], content);
  node["sourceInfo"] = eqNo;
  return node;
}

export function linkNode(content: LinkContent) {
  return simpleNode("custom_link", [], content);
}

export function astMatches(expected, actual, index: number[]): string {
  for (const key in expected) {
    if (key === "children") {
      continue;
    } else if (key === "content") {
      const e = JSON.stringify(expected[key]);
      const a = JSON.stringify(actual[key]);
      if (e !== a) {
        const err = `[content] mismatch - expected [${e}], actual [${a}]`;
        return addIndex(index, err);
      }
    } else if (expected[key] !== actual[key]) {
      const err = `[${key}] mismatch - expected [${expected[key]}], actual [${actual[key]}]`;
      return addIndex(index, err);
    }
  }
  return astArrayMatches(expected["children"], actual["children"], index);
}

export function astArrayMatches(
  expected: any[],
  actual: any[],
  index: number[]
) {
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

export function safeLen(arr: any[]) {
  return arr ? arr.length : 0;
}

export function addIndex(index: number[], logMessage: string) {
  return "[" + index.join(", ") + "]: " + logMessage;
}

export function stripExcessFields(tree: AstNode[]): Partial<AstNode>[] {
  const copy: Partial<AstNode>[] = [];
  for (const node of tree) {
    const { type, block, content, children, index, expansionOf } = node;
    let copyContent = content;
    if (typeof copyContent !== "string") {
      copyContent = {...content};
      if(content.linkTarget) {
        copyContent.linkTarget = {...content.linkTarget}
        if(copyContent.linkTarget?.propPtr) {
          copyContent.linkTarget.propPtr = copyContent.linkTarget?.propPtr.toString();
        }
        if(copyContent.linkTarget?.ptr) {
          copyContent.linkTarget.ptr = copyContent.linkTarget?.ptr.toString();
        }
        
      }
    }
    copy.push({
      type,
      block,
      content: copyContent,
      index,
      expansionOf,
      children: stripExcessFields(children) as AstNode[],
    });
  }
  return copy;
}
