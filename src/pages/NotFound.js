import React from "react";

export default function NotFound() {
  return (
    <main className="flex flex-col items-center justify-center py-24 min-h-[50vh]">
      <h2 className="text-4xl text-error font-bold mb-5">404 - Page Not Found</h2>
      <a className="btn btn-primary" href="/">Go Home</a>
    </main>
  );
}
