{pkgs}: {
  deps = [
    pkgs.at-spi2-core
    pkgs.dbus
    pkgs.cups
    pkgs.alsa-lib
    pkgs.cairo
    pkgs.pango
    pkgs.libxkbcommon
    pkgs.expat
    pkgs.mesa
    pkgs.libdrm
    pkgs.xorg.libXrender
    pkgs.xorg.libXrandr
    pkgs.xorg.libXfixes
    pkgs.xorg.libXext
    pkgs.xorg.libXdamage
    pkgs.xorg.libXcomposite
    pkgs.xorg.libxcb
    pkgs.xorg.libX11
    pkgs.at-spi2-atk
    pkgs.atk
    pkgs.nspr
    pkgs.nss
    pkgs.glib
  ];
}
