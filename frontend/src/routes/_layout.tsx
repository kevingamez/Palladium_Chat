import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_layout')({
  component: LayoutOutlet,
});

function LayoutOutlet() {
  return <Outlet />;
}

export default LayoutOutlet;