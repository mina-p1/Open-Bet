import React from "react";

function Footer() {
  return (
    <footer className="bg-gray-100 border-t py-6 text-center text-gray-600 dark:bg-gray-900 dark:text-gray-400">
      <div className="container mx-auto">
        &copy; {new Date().getFullYear()} OpenBet. All rights reserved.
      </div>
      
    </footer>
  );
}

export default Footer;
