/*
 * Wegas
 * http://wegas.albasim.ch
 *
 * Copyright (c) 2013-2018 School of Business and Engineering Vaud, Comem, MEI
 * Licensed under the MIT License
 */
package com.wegas.core.persistence.variable.statemachine;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.wegas.core.i18n.persistence.TranslatableContent;
import com.wegas.core.i18n.persistence.TranslationContentDeserializer;
import com.wegas.core.merge.annotations.WegasEntityProperty;
import javax.persistence.CascadeType;
import javax.persistence.Entity;
import javax.persistence.OneToOne;

/**
 *
 * @author Francois-Xavier Aeberhard (fx at red-agent.com)
 */
@Entity
public class DialogueTransition extends AbstractTransition {

    private static final long serialVersionUID = 1L;

    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonDeserialize(using = TranslationContentDeserializer.class)
    @WegasEntityProperty
    private TranslatableContent actionText;

    /**
     * @return the actionText
     */
    public TranslatableContent getActionText() {
        return actionText;
    }

    @Override
    public void setState(AbstractState state) {
        super.setState(state);
        if (state != null){
            this.setActionText(actionText);
        }
    }

    /**
     * @param actionText the actionText to set
     */
    public void setActionText(TranslatableContent actionText) {
        this.actionText = actionText;
        if (this.actionText != null && this.getState() != null) {
            this.actionText.setParentDescriptor(getState().getStateMachine());
        }
    }
}
