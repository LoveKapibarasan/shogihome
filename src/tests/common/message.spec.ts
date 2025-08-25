import { toPlainText } from "@/common/message";

describe("message", () => {
  it("toPlainText", () => {
    expect(toPlainText({ text: "Hello world!" })).toBe("Hello world!");
    expect(
      toPlainText({
        text: "Hello world!",
        attachments: [{ type: "list", items: [{ text: "Item 1" }, { text: "Item 2" }] }],
      }),
    ).toBe("Hello world!\n\n- Item 1\n- Item 2");
  });
});
