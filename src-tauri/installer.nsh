!macro customInstall
  ; === 1. Create ProgID (defines how to open files with our app) ===
  WriteRegStr HKCU "Software\Classes\ImageViewerOCR" "" "Image Viewer"
  WriteRegStr HKCU "Software\Classes\ImageViewerOCR\DefaultIcon" "" "$INSTDIR\${PRODUCTNAME}.exe,0"
  WriteRegStr HKCU "Software\Classes\ImageViewerOCR\shell\open\command" "" '"$INSTDIR\${PRODUCTNAME}.exe" "%1"'

  ; === 2. Register file extensions ===
  ; For each extension: set default handler + add to OpenWithProgids
  !insertmacro RegisterExt ".png"
  !insertmacro RegisterExt ".jpg"
  !insertmacro RegisterExt ".jpeg"
  !insertmacro RegisterExt ".bmp"
  !insertmacro RegisterExt ".gif"
  !insertmacro RegisterExt ".webp"
  !insertmacro RegisterExt ".tiff"
  !insertmacro RegisterExt ".tif"
  !insertmacro RegisterExt ".ico"
  !insertmacro RegisterExt ".svg"

  ; === 3. Register as a "Default Program" candidate ===
  ; Makes the app appear in Settings > Default Apps
  WriteRegStr HKCU "Software\RegisteredApplications" "ImageViewerOCR" "Software\ImageViewerOCR\Capabilities"
  WriteRegStr HKCU "Software\ImageViewerOCR\Capabilities" "ApplicationName" "Image Viewer OCR"
  WriteRegStr HKCU "Software\ImageViewerOCR\Capabilities" "ApplicationDescription" "Image viewer with OCR text recognition"
  !insertmacro RegisterFileAssoc ".png"
  !insertmacro RegisterFileAssoc ".jpg"
  !insertmacro RegisterFileAssoc ".jpeg"
  !insertmacro RegisterFileAssoc ".bmp"
  !insertmacro RegisterFileAssoc ".gif"
  !insertmacro RegisterFileAssoc ".webp"
  !insertmacro RegisterFileAssoc ".tiff"
  !insertmacro RegisterFileAssoc ".tif"
  !insertmacro RegisterFileAssoc ".ico"
  !insertmacro RegisterFileAssoc ".svg"

  ; === 4. Register supported types (displayed in Settings) ===
  !insertmacro RegisterSupportedType "PNG" ".png"
  !insertmacro RegisterSupportedType "JPG" ".jpg"
  !insertmacro RegisterSupportedType "JPEG" ".jpeg"
  !insertmacro RegisterSupportedType "BMP" ".bmp"
  !insertmacro RegisterSupportedType "GIF" ".gif"
  !insertmacro RegisterSupportedType "WEBP" ".webp"
  !insertmacro RegisterSupportedType "TIFF" ".tiff"
  !insertmacro RegisterSupportedType "TIF" ".tif"
  !insertmacro RegisterSupportedType "ICO" ".ico"
  !insertmacro RegisterSupportedType "SVG" ".svg"

  ; === 5. Notify Windows to refresh file associations ===
  System::Call 'shell32.dll::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'
!macroend

!macro customUninstall
  ; === 1. Remove ProgID ===
  DeleteRegKey HKCU "Software\Classes\ImageViewerOCR"

  ; === 2. Remove OpenWithProgids for each extension ===
  !insertmacro RemoveOpenWithProgid ".png"
  !insertmacro RemoveOpenWithProgid ".jpg"
  !insertmacro RemoveOpenWithProgid ".jpeg"
  !insertmacro RemoveOpenWithProgid ".bmp"
  !insertmacro RemoveOpenWithProgid ".gif"
  !insertmacro RemoveOpenWithProgid ".webp"
  !insertmacro RemoveOpenWithProgid ".tiff"
  !insertmacro RemoveOpenWithProgid ".tif"
  !insertmacro RemoveOpenWithProgid ".ico"
  !insertmacro RemoveOpenWithProgid ".svg"

  ; === 3. Remove Default Program registration ===
  DeleteRegValue HKCU "Software\RegisteredApplications" "ImageViewerOCR"
  DeleteRegKey HKCU "Software\ImageViewerOCR"

  ; === 4. Refresh file association cache ===
  System::Call 'shell32.dll::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'
!macroend

; --- Helper macros ---
!macro RegisterExt EXT
  WriteRegStr HKCU "Software\Classes\${EXT}" "" "ImageViewerOCR"
  WriteRegNone HKCU "Software\Classes\${EXT}\OpenWithProgids" "ImageViewerOCR"
!macroend

!macro RegisterFileAssoc EXT
  WriteRegStr HKCU "Software\ImageViewerOCR\Capabilities\FileAssociations" "${EXT}" "ImageViewerOCR"
!macroend

!macro RegisterSupportedType NAME EXT
  WriteRegStr HKCU "Software\ImageViewerOCR\Capabilities\SupportedFileTypes" "${NAME}" "${EXT}"
!macroend

!macro RemoveOpenWithProgid EXT
  DeleteRegValue HKCU "Software\Classes\${EXT}\OpenWithProgids" "ImageViewerOCR"
!macroend
