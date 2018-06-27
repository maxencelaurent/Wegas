/*
 * Wegas
 * http://wegas.albasim.ch
 *
 * Copyright (c) 2013-2018 School of Business and Engineering Vaud, Comem, MEI
 * Licensed under the MIT License
 */
package com.wegas.core.jcr.jta;

import com.wegas.core.jcr.content.ContentConnector;
import com.wegas.core.jcr.page.Pages;
import com.wegas.core.persistence.game.GameModel;
import java.io.Serializable;
import javax.ejb.Local;
import javax.ejb.Stateless;
import javax.enterprise.context.ContextNotActiveException;
import javax.inject.Inject;
import javax.jcr.RepositoryException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 *
 * Convenient methods to obtains Pages and ContentConnector, managed or not.
 *
 * @author maxence
 */
@Stateless
@Local
public class JCRConnectorProvider implements Serializable {

    private static final Logger logger = LoggerFactory.getLogger(JCRConnectorProvider.class);

    private static final long serialVersionUID = 1813671957414821987L;

    /**
     * TransactionScoped provider
     */
    @Inject
    private JCRConnectorProviderTx txBean;

    /**
     * Get a connector to the gamemodel pages repository
     * <p>
     * If a transaction is running in the caller context, the returned connector will be managed by JTA.
     *
     * @param gameModel the gameModel
     *
     * @return Pages connector
     *
     * @throws RepositoryException something went wrong
     */
    public Pages getPages(GameModel gameModel) throws RepositoryException {
        return (Pages) this.getConnector(gameModel, RepositoryType.PAGES);
    }

    /**
     * Get a connector to the gamemodel content repository
     * <p>
     * If a transaction is running in the caller context, the returned connector will be managed by JTA.
     *
     * @param gameModel the gameModel
     * @param wsType    FILES or HISTORY
     *
     * @return content connector
     *
     * @throws RepositoryException
     */
    public ContentConnector getContentConnector(GameModel gameModel, ContentConnector.WorkspaceType wsType) throws RepositoryException {
        return (ContentConnector) this.getConnector(gameModel, RepositoryType.valueOf(wsType.toString()));
    }

    /**
     * Get a connector. Returns a managed connector if a transaction is available, a non managed otherwise.
     *
     * @param gameModel the gameModel
     * @param type      which type of repository ? pages, files or history.
     *
     * @return a JTARepositoryConnector
     *
     * @throws RepositoryException oups...
     */
    private JTARepositoryConnector getConnector(GameModel gameModel, RepositoryType type) throws RepositoryException {
        try {
            return txBean.getConnector(gameModel, type);
        } catch (ContextNotActiveException ex) {
            return JCRConnectorProviderTx.getDetachedConnector(gameModel, type);
        }
    }

    /**
     *
     */
    public enum RepositoryType {
        FILES,
        HISTORY,
        PAGES
    }
}