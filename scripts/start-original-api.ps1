param([ValidateRange(1024,65535)][int]$Port = 8081)
$ErrorActionPreference = 'Stop'
$apiJar = Join-Path $PSScriptRoot '../../real/Backend/brasil/target/brasil-0.0.1-SNAPSHOT.jar'
if (-not (Test-Path -LiteralPath $apiJar)) {
  throw 'JAR da API original não encontrado. Gere o JAR no projeto real/Backend/brasil com .\mvnw.cmd package -DskipTests e execute este comando novamente.'
}
Write-Host "Iniciando a API de localizações na porta $Port. O Radar pode continuar na porta 8080."
& java -jar (Resolve-Path -LiteralPath $apiJar).Path "--server.port=$Port" '--spring.jpa.show-sql=false'
exit $LASTEXITCODE
