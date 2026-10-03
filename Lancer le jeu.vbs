Set oShell = CreateObject("WScript.Shell")
Set oFSO = CreateObject("Scripting.FileSystemObject")

' Chemin du projet (meme dossier que ce script)
Dim sDir
sDir = oFSO.GetParentFolderName(WScript.ScriptFullName)

' Lance le serveur Vite en arriere-plan
oShell.CurrentDirectory = sDir
oShell.Run "cmd /c npx vite", 0, False

' Attend 4 secondes que le serveur demarre
WScript.Sleep 4000

' Ouvre le jeu dans le navigateur par defaut
oShell.Run "http://localhost:5173"

MsgBox "Asymmetric War est lance !" & Chr(13) & Chr(10) & Chr(13) & Chr(10) & "Le jeu tourne dans votre navigateur." & Chr(13) & Chr(10) & "Fermez le terminal 'npx vite' pour arreter le serveur.", 64, "Asymmetric War"
