'use client';
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';

const NO_NAVBAR = ['/', '/setup'];

export default function NavbarWrapper() {
  const pathname = usePathname();
  if (NO_NAVBAR.includes(pathname)) return null;
  return <Navbar />;
}
