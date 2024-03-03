FROM jenkins/jenkins:2.341

# Set Tags
  LABEL maintainer="Brooks C. Clemans <brooks@clemans.net>"

# Set Environment Variables
  ENV CASC_JENKINS_CONFIG=/var/jenkins_conf
  ENV JENKINS_HOME="/var/jenkins_home"
  ENV JAVA_OPTS="-Djenkins.install.runSetupWizard=false -Dhudson.model.DownloadService.noSignatureCheck=true -Dhudson.model.DirectoryBrowserSupport.CSP=\"default-src 'self'; img-src 'self data:;\""

# Install custom plugins
  COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
  COPY *.yaml $CASC_JENKINS_CONFIG/
  RUN /usr/local/bin/install-plugins.sh < /usr/share/jenkins/ref/plugins.txt

# User back to jenkins
  USER jenkins
