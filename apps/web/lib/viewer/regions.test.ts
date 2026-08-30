import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clampPage,
  filterRegionsForPage,
  getFirstRegionPage,
  getRegionPages,
  regionToPercentStyle,
  regionToPixelRect,
} from "./regions";
import type { AnswerRegion } from "@vedaai/types";

describe("regionToPixelRect", () => {
  it("converts normalized coordinates to pixels", () => {
    const region: AnswerRegion = {
      page: 1,
      x: 0.1,
      y: 0.2,
      width: 0.5,
      height: 0.25,
    };
    assert.deepEqual(regionToPixelRect(region, 1000, 800), {
      left: 100,
      top: 160,
      width: 500,
      height: 200,
    });
  });

  it("returns null for invalid regions", () => {
    const invalid: AnswerRegion = {
      page: 0,
      x: 0.1,
      y: 0.1,
      width: 0.2,
      height: 0.2,
    };
    assert.equal(regionToPixelRect(invalid, 100, 100), null);
  });

  it("returns null for invalid page dimensions", () => {
    const region: AnswerRegion = {
      page: 1,
      x: 0.1,
      y: 0.1,
      width: 0.2,
      height: 0.2,
    };
    assert.equal(regionToPixelRect(region, 0, 100), null);
  });
});

describe("filterRegionsForPage", () => {
  const regions: AnswerRegion[] = [
    { page: 2, x: 0.1, y: 0.1, width: 0.2, height: 0.1 },
    { page: 3, x: 0.1, y: 0.2, width: 0.2, height: 0.1 },
    { page: 2, x: 0.3, y: 0.3, width: 0.2, height: 0.1 },
    { page: 1, x: -0.1, y: 0.1, width: 0.2, height: 0.1 },
  ];

  it("keeps only valid regions for the current page", () => {
    const page2 = filterRegionsForPage(regions, 2);
    assert.equal(page2.length, 2);
    assert.ok(page2.every((region) => region.page === 2));
  });

  it("supports multi-page answers without merging pages", () => {
    assert.equal(filterRegionsForPage(regions, 3).length, 1);
    assert.equal(filterRegionsForPage(regions, 99).length, 0);
  });
});

describe("getFirstRegionPage", () => {
  it("returns the earliest valid page", () => {
    assert.equal(
      getFirstRegionPage([
        { page: 3, x: 0.1, y: 0.1, width: 0.2, height: 0.1 },
        { page: 2, x: 0.1, y: 0.1, width: 0.2, height: 0.1 },
      ]),
      2,
    );
  });

  it("returns null when no valid regions exist", () => {
    assert.equal(getFirstRegionPage([]), null);
    assert.equal(
      getFirstRegionPage([
        { page: 0, x: 0.1, y: 0.1, width: 0.2, height: 0.1 },
      ]),
      null,
    );
  });
});

describe("getRegionPages", () => {
  it("returns sorted unique pages for multi-page answers", () => {
    assert.deepEqual(
      getRegionPages([
        { page: 3, x: 0.1, y: 0.1, width: 0.2, height: 0.1 },
        { page: 1, x: 0.1, y: 0.1, width: 0.2, height: 0.1 },
        { page: 3, x: 0.2, y: 0.2, width: 0.2, height: 0.1 },
      ]),
      [1, 3],
    );
  });
});

describe("clampPage", () => {
  it("keeps pages within 1..totalPages", () => {
    assert.equal(clampPage(0, 4), 1);
    assert.equal(clampPage(5, 4), 4);
    assert.equal(clampPage(2.7, 4), 2);
    assert.equal(clampPage(Number.NaN, 4), 1);
    assert.equal(clampPage(1, 0), 1);
  });
});

describe("regionToPercentStyle", () => {
  it("converts normalized regions to percentage CSS for zoom-safe overlays", () => {
    assert.deepEqual(
      regionToPercentStyle({
        page: 1,
        x: 0.1,
        y: 0.2,
        width: 0.5,
        height: 0.25,
      }),
      {
        left: "10%",
        top: "20%",
        width: "50%",
        height: "25%",
      },
    );
  });

  it("returns null for invalid regions", () => {
    assert.equal(
      regionToPercentStyle({
        page: 0,
        x: 0.1,
        y: 0.1,
        width: 0.2,
        height: 0.2,
      }),
      null,
    );
  });
});
