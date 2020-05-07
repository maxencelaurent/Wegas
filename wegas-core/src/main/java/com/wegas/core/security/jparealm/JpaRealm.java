/**
 * Wegas
 * http://wegas.albasim.ch
 *
 * Copyright (c) 2013-2020 School of Business and Engineering Vaud, Comem, MEI
 * Licensed under the MIT License
 */
package com.wegas.core.security.jparealm;

import com.wegas.core.Helper;
import com.wegas.core.ejb.RequestFacade;
import com.wegas.core.ejb.RequestManager;
import com.wegas.core.exception.internal.WegasNoResultException;
import com.wegas.core.security.ejb.AccountFacade;
import com.wegas.core.security.persistence.Permission;
import com.wegas.core.security.util.JpaAuthenticationInfo;
import javax.ejb.EJBException;
import org.apache.shiro.authc.AuthenticationException;
import org.apache.shiro.authc.AuthenticationInfo;
import org.apache.shiro.authc.AuthenticationToken;
import org.apache.shiro.authc.UsernamePasswordToken;
import org.apache.shiro.authz.AuthorizationInfo;
import org.apache.shiro.authz.SimpleAuthorizationInfo;
import org.apache.shiro.realm.AuthorizingRealm;
import org.apache.shiro.subject.PrincipalCollection;
import org.apache.shiro.util.SimpleByteSource;
import org.slf4j.LoggerFactory;

/**
 *
 * @author Francois-Xavier Aeberhard (fx at red-agent.com)
 */
public class JpaRealm extends AuthorizingRealm {

    private static final org.slf4j.Logger logger = LoggerFactory.getLogger(JpaRealm.class);

    /**
     *
     */
    public JpaRealm() {
        setName("JpaRealm");                                                    //This name must match the name in the User class's getPrincipals() method
    }

    @Override
    protected AuthenticationInfo doGetAuthenticationInfo(AuthenticationToken authcToken) throws AuthenticationException {
        UsernamePasswordToken token = (UsernamePasswordToken) authcToken;
        AccountFacade accountFacade = AccountFacade.lookup();
        RequestManager requestManager = RequestFacade.lookup().getRequestManager();
        try {
            requestManager.su();
            JpaAccount account = accountFacade.findJpaByEmail(token.getUsername());

            JpaAuthenticationInfo info = new JpaAuthenticationInfo(account.getId(),
                account.getShadow().getPasswordHex(),
                new SimpleByteSource(account.getShadow().getSalt()),
                getName(), account.getShadow().getHashMethod());
            return info;

        } catch (WegasNoResultException e) {
            // Could not find correponding mail,
            try {
                JpaAccount account = accountFacade.findJpaByUsername(token.getUsername());// try with the username

                JpaAuthenticationInfo info = new JpaAuthenticationInfo(account.getId(),
                    account.getShadow().getPasswordHex(),
                    new SimpleByteSource(account.getShadow().getSalt()),
                    getName(), account.getShadow().getHashMethod());
                return info;

            } catch (WegasNoResultException ex) {
                logger.error("Unable to find token", ex);
                return null;
            }
        } finally {
            requestManager.releaseSu();
        }
    }

    @Override
    protected AuthorizationInfo doGetAuthorizationInfo(PrincipalCollection principals) {
        try {
            SimpleAuthorizationInfo info = new SimpleAuthorizationInfo();

            RequestManager rManager = RequestFacade.lookup().getRequestManager();

            for (String roleName : rManager.getEffectiveRoles()) {
                info.addRole(roleName);
            }

            /**
             * Load permissions from DB
             */
            for (String p : rManager.getEffectiveDBPermissions()) {
                info.addStringPermission(p);
            }

            return info;
        } catch (EJBException e) {
            Helper.printWegasStackTrace(e);
            return null;
        }
    }

    /**
     *
     * @param info
     * @param p
     */
    public static void addPermissions(SimpleAuthorizationInfo info, Permission p) {
        info.addStringPermission(p.getValue());
        /*if (p.getInducedPermission() != null && !p.getInducedPermission().isEmpty()) {
            info.addStringPermission(p.getInducedPermission());
        }*/
    }
}
