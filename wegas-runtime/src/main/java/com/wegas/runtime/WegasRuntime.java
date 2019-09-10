/*
 * Wegas
 * http://wegas.albasim.ch
 *
 * Copyright (c) 2013-2018 School of Business and Engineering Vaud, Comem, MEI
 * Licensed under the MIT License
 */
package com.wegas.runtime;

import com.github.difflib.DiffUtils;
import com.github.difflib.algorithm.DiffException;
import com.github.difflib.patch.Patch;
import com.github.difflib.patch.PatchFailedException;
import fish.payara.micro.BootstrapException;
import fish.payara.micro.PayaraMicro;
import fish.payara.micro.PayaraMicroRuntime;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.PropertyResourceBundle;

/**
 * Main class to run Wegas
 *
 * @author maxence
 */
public class WegasRuntime {

    private static final Map<String, String> env;

    public static final String WEGAS_DB_NAME_KEY = "wegas.db.name";
    public static final String WEGAS_DB_HOST_KEY = "wegas.db.host";
    public static final String WEGAS_HTTP_THREADS_KEY = "wegas.http.threads";
    public static final String WEGAS_HTTP_POPULATORS_KEY = "wegas.nb_populators";
    public static final String CACHE_COORDINATION_PROTOCOL = "eclipselink.cache.coordination.protocol";
    public static final String CACHE_COORDINATION_CHANNEL = "eclipselink.cache.coordination.channel";

    public static final String PROPERTIES_PATH = "./src/main/resources/wegas-override.properties";

    private PayaraMicroRuntime payara;
    private String appName;
    private String baseUrl;
    private File domainConfig;

    private static boolean init = false;

    static {
        env = new HashMap<>();

        env.put(WEGAS_DB_NAME_KEY, "wegas_dev");
        env.put(WEGAS_DB_HOST_KEY, "localhost");
        env.put(WEGAS_HTTP_THREADS_KEY, "5");
        env.put(WEGAS_HTTP_POPULATORS_KEY, "3");
        env.put(CACHE_COORDINATION_PROTOCOL, "fish.payara.persistence.eclipselink.cache.coordination.HazelcastPublishingTransportManager");

        String clusterName;
        try {
            InetAddress localHost = InetAddress.getLocalHost();
            clusterName = "Hz" + localHost.getHostName() + "Cluster";
        } catch (UnknownHostException ex) {
            clusterName = "HzLocalCluster";
        }

        env.put(CACHE_COORDINATION_CHANNEL, clusterName);
    }

    public WegasRuntime() {
    }

    public PayaraMicroRuntime getPayara() {
        return payara;
    }

    public void setPayara(PayaraMicroRuntime payara) {
        this.payara = payara;
    }

    public String getAppName() {
        return appName;
    }

    public void setAppName(String appName) {
        this.appName = appName;
    }

    public File getDomainConfig() {
        return domainConfig;
    }

    public void setDomainConfig(File domainConfig) {
        this.domainConfig = domainConfig;
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public String toString() {
        return "WegasRuntime UP: " + baseUrl;
    }

    public static void resetDB(String dbName) {
        final String DB_CON = "jdbc:postgresql://localhost:5432/" + dbName;
        final String USER = "user";
        final String PASSWORD = "1234";
        try (Connection connection = DriverManager.getConnection(DB_CON, USER, PASSWORD);
                Statement st = connection.createStatement()) {
            st.execute("DROP SCHEMA public CASCADE;");
            st.execute("CREATE SCHEMA public;");
        } catch (SQLException ex) {
        }
    }

    /**
     * ENv := Default static env + wegas.properties file + extraEnv
     *
     * @param extraEnv
     *
     * @throws IOException
     */
    public static final void initEnv(Map<String, String> extraEnv) throws IOException {

        try (FileInputStream fis = new FileInputStream(PROPERTIES_PATH)) {
            PropertyResourceBundle properties = new PropertyResourceBundle(fis);
            for (String k : properties.keySet()) {
                env.put(k, properties.getString(k));
            }
        }

        if (extraEnv != null) {
            env.putAll(extraEnv);
        }
        env.forEach(System::setProperty);
    }

    public static final WegasRuntime boot(Boolean resetDb) throws BootstrapException, IOException {
        if (!init) {
            initEnv(null);
        }

        WegasRuntime wr = new WegasRuntime();

        if (resetDb != null && resetDb) {
            resetDB(System.getProperty(WEGAS_DB_NAME_KEY));
        }

        String root = "../wegas-app/";

        File domainConfig = new File("./src/main/resources/domain.xml");
        File tmpDomainConfig = File.createTempFile("domain", ".xml");

        Files.copy(domainConfig.toPath(), tmpDomainConfig.toPath(), StandardCopyOption.REPLACE_EXISTING);

        String warPath = root + "target/Wegas";

        File theWar = new File(warPath);

        PayaraMicroRuntime bootstrap = PayaraMicro.getInstance()
                .setAlternateDomainXML(tmpDomainConfig)
                .addDeploymentFile(theWar)
                .setHttpAutoBind(true)
                .setSslAutoBind(true)
                .bootStrap();

        String appName = bootstrap.getDeployedApplicationNames().iterator().next();
        Integer httpPort = bootstrap.getLocalDescriptor().getHttpPorts().get(0);
        String appUrl = bootstrap.getLocalDescriptor().getApplicationURLS().get(0).toString();

        System.out.println("AppName: " + appName);
        System.out.println("Port: " + httpPort);
        System.out.println("URL: " + appUrl);

        wr.setAppName(appName);
        wr.setBaseUrl("http://localhost:" + httpPort + "/" + appName);
        wr.setDomainConfig(tmpDomainConfig);
        wr.setPayara(bootstrap);
        return wr;
    }

    public static void main(String... args) throws BootstrapException, IOException {
        try {

            File defaultProperties = new File("./src/main/resources/default_wegas.properties");

            File oriDefaultProperties = new File("./src/main/resources/default_wegas.properties.orig");
            File properties = new File(PROPERTIES_PATH);

            if (properties.exists()) {
                try {
                    // try to patch
                    List<String> oriLines = Files.readAllLines(oriDefaultProperties.toPath());
                    List<String> modLines = Files.readAllLines(defaultProperties.toPath());
                    List<String> targetLines = Files.readAllLines(properties.toPath());

                    Patch<String> patch = DiffUtils.diff(oriLines, modLines);

                    List<String> result = patch.applyTo(targetLines);
                    Files.write(properties.toPath(), result);

                } catch (PatchFailedException ex) {
                    System.out.println("Failed to patch " + properties.getAbsolutePath() + "! Please edit it manually");
                    return;
                } catch (DiffException ex) {
                    System.out.println("Failed to diff " + properties.getAbsolutePath() + "! Please edit it manually");
                    return;
                } finally {
                    Files.copy(defaultProperties.toPath(), oriDefaultProperties.toPath(), StandardCopyOption.REPLACE_EXISTING);
                }

            } else {
                // Copy
                Files.copy(defaultProperties.toPath(), oriDefaultProperties.toPath(), StandardCopyOption.REPLACE_EXISTING);
                Files.copy(defaultProperties.toPath(), properties.toPath(), StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException ex) {
            System.out.println("Failed to read some file: " + ex);
            System.err.println("Abort");
            return;
        }

        WegasRuntime payara1 = WegasRuntime.boot(false);

        Runtime.getRuntime()
                .addShutdownHook(new Thread() {
                    @Override
                    public void run() {
                        System.out.println("Shutdown Hook");
                        try {
                            if (payara1 != null) {
                                payara1.getPayara().shutdown();
                            }

                            //if (payara2 != null) {
                            //payara2.getPayara().shutdown();
                            //}
                        } catch (BootstrapException ex) {
                            System.out.println("Shutdown failed with " + ex);
                        }
                    }
                });

        System.out.println("Running");
    }
}