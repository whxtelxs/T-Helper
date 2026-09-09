import { Shell } from "./app/Shell";
import { ImportDialog } from "./menu/ImportDialog";
import { NavProvider } from "./navigation/NavProvider";
import { SearchProvider } from "./search/SearchProvider";
import { ToastViewport } from "./toast/ToastViewport";
import { UpdateDialog } from "./update/UpdateDialog";

export function App() {
  return (
    <NavProvider>
      <SearchProvider>
        <Shell />
      </SearchProvider>
      <ImportDialog />
      <UpdateDialog />
      <ToastViewport />
    </NavProvider>
  );
}
