import { copyToClipboard } from "../lib/clipboard";
import { toast } from "../toast/store";

type CopyButtonProps = {
  text: string;
  block?: boolean;
};

export function CopyButton({ text, block = false }: CopyButtonProps) {
  const copy = async () => {
    if (await copyToClipboard(text)) {
      toast.success("Скопировано");
    } else {
      toast.error("Не удалось скопировать");
    }
  };

  return (
    <button
      type="button"
      class={block ? "copy-btn copy-btn--block" : "copy-btn"}
      onClick={() => void copy()}
    >
      Копировать
    </button>
  );
}
