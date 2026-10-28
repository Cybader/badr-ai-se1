Option Explicit
' Badr AI - Systeme d'Exploitation 1 : lanceur hors-ligne
Dim fso, shell, base, target
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
base = fso.GetParentFolderName(WScript.ScriptFullName)
target = fso.BuildPath(base, "index.html")
If Not fso.FileExists(target) Then
  MsgBox "index.html est introuvable dans le dossier de la plateforme.", 16, "Badr AI"
  WScript.Quit 1
End If
shell.Run """" & target & """", 1, False
