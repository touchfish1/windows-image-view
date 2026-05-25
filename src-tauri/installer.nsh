!macro customInstall
  ; Register Default Program capabilities
  WriteRegStr HKCU "Software\RegisteredApplications" "ImageViewerOCR" "Software\ImageViewerOCR\Capabilities"
  WriteRegStr HKCU "Software\ImageViewerOCR\Capabilities" "ApplicationName" "Image Viewer OCR"
  WriteRegStr HKCU "Software\ImageViewerOCR\Capabilities" "ApplicationDescription" "Image viewer with OCR text recognition"

  ; Register file associations
  WriteRegStr HKCU "Software\ImageViewerOCR\Capabilities\FileAssociations" ".png" "ImageViewerOCR"
  WriteRegStr HKCU "Software\ImageViewerOCR\Capabilities\FileAssociations" ".jpg" "ImageViewerOCR"
  WriteRegStr HKCU "Software\ImageViewerOCR\Capabilities\FileAssociations" ".jpeg" "ImageViewerOCR"
  WriteRegStr HKCU "Software\ImageViewerOCR\Capabilities\FileAssociations" ".bmp" "ImageViewerOCR"
  WriteRegStr HKCU "Software\ImageViewerOCR\Capabilities\FileAssociations" ".gif" "ImageViewerOCR"
  WriteRegStr HKCU "Software\ImageViewerOCR\Capabilities\FileAssociations" ".webp" "ImageViewerOCR"
  WriteRegStr HKCU "Software\ImageViewerOCR\Capabilities\FileAssociations" ".tiff" "ImageViewerOCR"
  WriteRegStr HKCU "Software\ImageViewerOCR\Capabilities\FileAssociations" ".ico" "ImageViewerOCR"
!macroend

!macro customUninstall
  ; Clean up registry on uninstall
  DeleteRegValue HKCU "Software\RegisteredApplications" "ImageViewerOCR"
  DeleteRegKey HKCU "Software\ImageViewerOCR"
!macroend
