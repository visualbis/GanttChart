workflow "workflow" {
  resolves = ["npm update"]
  on = "fork"
}

action "Docker" {
  uses = "actions/docker/cli@8cdf801b322af5f369e00d85e9cf3a7122f49108"
  args = "run node node -e 'console.log(\"oi\")'"
}

action "root npm" {
  uses = "actions/npm@59b64a598378f31e49cb76f27d6f3312b582f680"
  needs = ["Docker"]
  args = "install"
}

action "npm update" {
  uses = "./npminstall"
  needs = ["root npm"]
}
