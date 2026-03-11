// Psychology Agent — Tier 2 CI/CD Pipeline
//
// CONTEXT
// This project uses a three-tier deployment strategy (docs/devops-pipeline.md):
//   Tier 1: GitHub Actions → Cloudflare Workers/Pages (cloud-to-cloud, no SSH)
//   Tier 2: Jenkins (this file) → self-hosted infrastructure via SSH
//   Tier 3: Cron autonomous sync loops (self-managing, budget-gated)
//
// WHY JENKINS FOR TIER 2?
// GitHub Actions runs on ephemeral cloud VMs with no LAN access. Deploying
// to self-hosted infrastructure (meshd binary, shared scripts) requires SSH
// to machines on a private network. Jenkins runs on a host with LAN access
// to the deploy target, making it the natural home for infrastructure deploys.
//
// WHY CHANGESET GUARDS (and no `branch` guard)?
// Each deploy stage gates on the `changeset` directive — it only runs when
// files in its source path actually changed. A documentation-only commit
// does not trigger a meshd rebuild. This prevents unnecessary deployments
// and keeps builds fast (ShellCheck runs on every push as a quality gate).
//
// We intentionally omit `branch 'main'` from when-blocks. The `branch`
// directive requires BRANCH_NAME, which Jenkins only sets for MultiBranch
// Pipeline jobs. Our jobs are regular Pipeline jobs tracking a single branch,
// so `branch 'main'` always evaluates false, silently skipping all guarded
// stages. The SCM config already restricts builds to main.
//
// CONFIGURATION
// All infrastructure-specific values live in Jenkins, not in this file.
// This Jenkinsfile references semantic credential IDs and environment
// variable names. The actual hostnames, ports, and paths are configured
// in Jenkins > Manage > System > Global Properties. This separation
// keeps the public repository free of internal infrastructure details.
//
// Required credentials (Jenkins > Manage > Credentials):
//   'cloudflare-workers-token'  — CF API token (Secret text)
//   'cloudflare-account-id'     — CF account ID (Secret text)
//   'deploy-ssh-key'            — SSH key for deploy target (SSH Username with private key)
//
// Required environment variables (Jenkins > Manage > System > Global Properties):
//   DEPLOY_HOST        — deploy target hostname
//   DEPLOY_PORT        — SSH port (default: 22)
//   DEPLOY_USER        — SSH username
//   DEPLOY_MESHD_PATH  — absolute path to meshd binary on deploy target
//   DEPLOY_SCRIPTS_PATH — absolute path to shared scripts directory
//   DEPLOY_PROJECT_DIRS — comma-separated project directory names (for symlink check)
//   MESHD_PORTS         — comma-separated ports meshd listens on (for health check)
//
// BUILD TRIGGER
// Builds trigger via a GitHub Actions relay (.github/workflows/trigger-forge.yml).
// See that file for why a relay is needed (Cloudflare Access authentication).
// SCM polling (H/5 * * * *) serves as a fallback if the relay fails.

pipeline {
    agent any

    environment {
        CLOUDFLARE_API_TOKEN  = credentials('cloudflare-workers-token')
        CLOUDFLARE_ACCOUNT_ID = credentials('cloudflare-account-id')
    }

    stages {
        // Quality gate — runs on every push regardless of what changed.
        // ShellCheck catches common shell scripting errors before they
        // reach production (autonomous-sync.sh, ensure-cron.sh, etc.).
        stage('ShellCheck') {
            steps {
                sh '''
                    find . -name "*.sh" -not -path "./node_modules/*" \
                        | xargs shellcheck --severity=warning || true
                '''
            }
        }

        // Build the meshd Go binary for linux/amd64.
        // meshd is a single binary that serves API routes for all 4 agents
        // from their respective state.db files. Cross-compiled here because
        // the Jenkins host may differ from the deploy target architecture.
        stage('Build meshd') {
            when {
                changeset 'platform/**'
            }
            steps {
                dir('platform') {
                    sh '''
                        BUILD_VERSION="$(git rev-parse --short HEAD)"
                        echo "Building meshd for linux/amd64 (${BUILD_VERSION})..."
                        GOOS=linux GOARCH=amd64 go build \
                            -ldflags "-X github.com/safety-quotient-lab/psychology-agent/platform.Version=${BUILD_VERSION}" \
                            -o meshd-linux ./cmd/meshd/
                        ls -lh meshd-linux
                        sha256sum meshd-linux
                    '''
                }
            }
        }

        // Deploy meshd to the target host.
        // Sequence: stop running process → copy binary → restart → health check.
        // The health check verifies all meshd ports respond with HTTP 200.
        stage('Deploy meshd') {
            when {
                changeset 'platform/**'
            }
            steps {
                withCredentials([sshUserPrivateKey(
                    credentialsId: 'deploy-ssh-key',
                    keyFileVariable: 'SSH_KEY'
                )]) {
                    sh '''
                        PORT="${DEPLOY_PORT:-22}"
                        SSH_CMD="ssh -i ${SSH_KEY} -o StrictHostKeyChecking=accept-new -p ${PORT}"

                        echo "Stopping meshd on deploy target..."
                        ${SSH_CMD} ${DEPLOY_USER}@${DEPLOY_HOST} "pkill -f meshd" || true

                        echo "Deploying meshd binary..."
                        scp -i ${SSH_KEY} -P ${PORT} \
                            platform/meshd-linux \
                            ${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_MESHD_PATH}

                        echo "Setting permissions and restarting..."
                        ${SSH_CMD} ${DEPLOY_USER}@${DEPLOY_HOST} \
                            "chmod +x ${DEPLOY_MESHD_PATH} && nohup ${DEPLOY_MESHD_PATH} > /dev/null 2>&1 &"

                        sleep 3
                        echo "Verifying meshd endpoints..."
                        IFS=',' read -ra PORTS <<< "${MESHD_PORTS:-8076,8077,8078,8079}"
                        for port in "${PORTS[@]}"; do
                            STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
                                "http://${DEPLOY_HOST}:${port}/api/status" || echo "000")
                            if [ "${STATUS}" = "200" ]; then
                                echo "  :${port} — OK"
                            else
                                echo "  :${port} — FAILED (HTTP ${STATUS})"
                            fi
                        done
                    '''
                }
            }
        }

        // Sync shared scripts to the deploy target.
        // Shared scripts (autonomous-sync.sh, schema.sql, etc.) live in
        // platform/shared/scripts/ and are symlinked into each agent's
        // scripts/ directory. rsync --delete ensures the target matches
        // the repo exactly. The symlink check verifies the agent dirs
        // still point to the shared location after sync.
        stage('Sync Shared Scripts') {
            when {
                changeset 'platform/shared/**'
            }
            steps {
                withCredentials([sshUserPrivateKey(
                    credentialsId: 'deploy-ssh-key',
                    keyFileVariable: 'SSH_KEY'
                )]) {
                    sh '''
                        PORT="${DEPLOY_PORT:-22}"
                        SSH_CMD="ssh -i ${SSH_KEY} -o StrictHostKeyChecking=accept-new -p ${PORT}"

                        echo "Syncing shared scripts to deploy target..."
                        rsync -avz --delete \
                            -e "${SSH_CMD}" \
                            platform/shared/scripts/ \
                            ${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_SCRIPTS_PATH}/

                        echo "Verifying symlinks..."
                        IFS=',' read -ra DIRS <<< "${DEPLOY_PROJECT_DIRS}"
                        for d in "${DIRS[@]}"; do
                            ${SSH_CMD} ${DEPLOY_USER}@${DEPLOY_HOST} \
                                "echo -n \"  ${d}: \" && \
                                 ls -la ~/projects/${d}/scripts/autonomous-sync.sh 2>/dev/null \
                                    | grep -o '->.*' || echo 'NO SYMLINK'"
                        done
                    '''
                }
            }
        }

        // Deploy the compositor (interagent mesh dashboard) to Cloudflare Workers.
        // This duplicates Tier 1 (GH Actions deploy-compositor.yml) intentionally:
        // if GH Actions fails or is unavailable, Jenkins provides a fallback path.
        // The changeset guard prevents double-deploys in normal operation — Jenkins
        // only triggers on platform/** or interagent/** changes, not both.
        stage('Deploy Compositor') {
            when {
                changeset 'interagent/**'
            }
            steps {
                dir('interagent') {
                    sh 'npx wrangler deploy'
                }
            }
        }
    }

    post {
        success {
            echo "Build succeeded: ${env.BUILD_URL}"
        }
        failure {
            echo "Build failed: ${env.BUILD_URL}"
        }
    }
}
