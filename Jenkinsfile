pipeline {
    agent any

    environment {
        CLOUDFLARE_API_TOKEN = credentials('cloudflare-workers-token')
        CLOUDFLARE_ACCOUNT_ID = credentials('cloudflare-account-id')
    }

    stages {
        stage('ShellCheck') {
            steps {
                sh '''
                    find . -name "*.sh" -not -path "./node_modules/*" \
                        | xargs shellcheck --severity=warning || true
                '''
            }
        }

        stage('Deploy Compositor') {
            when {
                branch 'main'
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
        failure {
            echo "Build failed: ${env.BUILD_URL}"
        }
    }
}
