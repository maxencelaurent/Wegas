/*
 * Wegas.
 * http://www.albasim.com/wegas/
 *
 * School of Business and Engineering Vaud, http://www.heig-vd.ch/
 * Media Engineering :: Information Technology Managment :: Comem
 *
 * Copyright (C) 2011
 */
package com.wegas.core.persistence.variabledescriptor;

import com.wegas.core.persistence.variableinstance.ListVariableInstanceEntity;
import java.util.List;
import java.util.logging.Logger;

import javax.persistence.CascadeType;
import javax.persistence.Entity;


import javax.persistence.OneToMany;
import javax.xml.bind.annotation.XmlTransient;
import javax.xml.bind.annotation.XmlType;

/**
 *
 * @author Francois-Xavier Aeberhard <fx@red-agent.com>
 */
@Entity
@XmlType(name = "ListVariableDescriptor")
public class ListVariableDescriptorEntity extends VariableDescriptorEntity<ListVariableInstanceEntity> {

    private static final long serialVersionUID = 1L;
    private static final Logger logger = Logger.getLogger("ListVariableDescriptorEntity");

}
