import {
  Language,
  PagePointer,
  PropositionPointer,
  ResourcePointer,
  ResourceType,
} from "sophize-datamodel";
import { CaseOption } from "./link-display-options";

export enum LinkType {
  UNKNOWN,
  COMMENT,
  RESOURCE_PTR,
  PROP_PTR,
  PAGE_PTR,
}

export interface MdContext {
  inline?: boolean;
  language?: Language;
  lookupTerms?: ResourcePointer[];
  contextPtr?: ResourcePointer;
  plainText?: boolean;
  caseOption?: CaseOption;
  addNegationMarker?: boolean;
}

export class LinkTarget {
  public linkType: LinkType = undefined;
  public commentId: number;
  public ptr: ResourcePointer;
  public propPtr: PropositionPointer;
  public pagePtr: PagePointer;

  toString() {
    switch (this.linkType) {
      case LinkType.UNKNOWN:
        return "Bad link";
      case LinkType.COMMENT:
        return this.ptr.toString() + "/" + this.commentId.toString();
      case LinkType.RESOURCE_PTR:
        return this.ptr.toString();
      case LinkType.PROP_PTR:
        return this.propPtr.toString();
      case LinkType.PAGE_PTR:
        return this.pagePtr.toString();
    }
  }
}

export class LinkHelpers {
  private static getPagePtr(parts: string[], contextPtr?: ResourcePointer) {
    // Case where datasetId is skipped is not handled.
    if (!parts || parts.length !== 3) {
      return null;
    }
    const ptr = ResourcePointer.fromString([parts[0], parts[1]].join("/"));
    if (!ptr || ptr.resourceType !== ResourceType.PROJECT) return null;
    return new PagePointer(ptr, parts[2]);
  }

  private static getPtr(parts: string[], contextPtr?: ResourcePointer) {
    if (!parts || parts.length === 0 || parts.length > 2) {
      return contextPtr;
    }
    if (parts.length === 1) {
      if (!contextPtr) return contextPtr;
      return ResourcePointer.fromString(
        [contextPtr.datasetId, parts[0]].join("/")
      );
    }
    return ResourcePointer.fromString([parts[0], parts[1]].join("/"));
  }

  public static getLinkTarget(target: string, contextPtr?: ResourcePointer) {
    if (!target) return null;
    const linkTarget = new LinkTarget();

    const targetParts = target.split("/");
    if (!targetParts || targetParts.length === 0) return null;

    const lastPart = targetParts[targetParts.length - 1];
    const commentId = +lastPart;
    if (commentId) {
      linkTarget.ptr = LinkHelpers.getPtr(targetParts.slice(0, -1), contextPtr);
      if (!linkTarget.ptr) return null;

      linkTarget.linkType = LinkType.COMMENT;
      linkTarget.commentId = commentId;
      return linkTarget;
    }
    const pagePtr = LinkHelpers.getPagePtr(targetParts, contextPtr);
    if (pagePtr) {
      linkTarget.linkType = LinkType.PAGE_PTR;
      linkTarget.pagePtr = pagePtr;
      return linkTarget;
    }

    const ptr = LinkHelpers.getPtr(targetParts, contextPtr);
    if (ptr) {
      linkTarget.linkType = LinkType.RESOURCE_PTR;
      linkTarget.ptr = ptr;
      return linkTarget;
    }

    let propPtr = PropositionPointer.fromString(target);
    if (!propPtr && contextPtr) {
      propPtr = PropositionPointer.fromString(
        [contextPtr.datasetId, target].join("/")
      );
    }
    if (propPtr) {
      linkTarget.linkType = LinkType.PROP_PTR;
      linkTarget.propPtr = propPtr;
      return linkTarget;
    }
    return null;
  }

  public static applyCase(input: string, caseOption: CaseOption) {
    if (!input) return input;
    if (caseOption === CaseOption.LOWER_CASE) {
      return input.charAt(0).toLowerCase() + input.substr(1);
    } else if (caseOption === CaseOption.UPPER_CASE) {
      return input.charAt(0).toUpperCase() + input.substr(1);
    }
    return input;
  }

  public static canApplyCase(str: string) {
    return !str || /^[a-z0-9]$/i.test(str.charAt(0));
  }

  private constructor() {}
}
